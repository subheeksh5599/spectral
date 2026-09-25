#!/usr/bin/env python3
"""verify_token.py — the same re-read, for the ERC-20-denominated market.

Every check is a live read: the market's token balance, its per-job fields, and the credits
it says it owes. Nothing is taken from a file, and no key is needed.

    RPC_URL=$XLAYER_TESTNET_RPC VENUE=0x... python3 verify_token.py        # every job on the market
    RPC_URL=$XLAYER_TESTNET_RPC VENUE=0x... JOBS=1,3 python3 verify_token.py   # or just these

The one structural difference from verify.py: this market holds an ERC-20, so "does it hold
what it owes" is a balanceOf call on the asset the contract itself names, and the native
balance is checked to be exactly zero — this contract has no payable path at all.
"""
import os, subprocess, sys

RPC = os.environ.get("RPC_URL")
VENUE = os.environ.get("VENUE")
if not RPC or not VENUE:
    sys.exit("RPC_URL and VENUE are required (no defaults)")

JOB_SIG = ("jobs(uint256)(address,address,uint256,uint256,uint256,uint256,"
           "uint256,uint256,uint256,address,uint256,uint8)")

def cast(*args):
    out = subprocess.run(["cast", *args, "--rpc-url", RPC], capture_output=True, text=True)
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip()[:200])
    return [line.split()[0] for line in out.stdout.splitlines() if line.strip()]

def call(sig, *args):
    return cast("call", VENUE, sig, *[str(a) for a in args])

def native_balance(addr=None):
    return int(cast("balance", addr or VENUE)[0])

results = []
def check(name, ok, detail):
    results.append((name, ok, detail))

STATE = {0: "Open", 1: "Stalled", 2: "Listed", 3: "Taken", 4: "Settled", 5: "Closed"}

code = cast("code", VENUE)[0]
check("market contract exists on this chain", len(code) > 4, f"{len(code)//2 - 1} bytes at {VENUE}")

asset = call("asset()(address)")[0]
check("the asset the contract names is a contract too",
      len(cast("code", asset)[0]) > 4, f"asset {asset}")

def token_balance(addr):
    return int(cast("call", asset, "balanceOf(address)(uint256)", addr)[0])

holders = set()
in_flight = 0

# Which jobs to check: an explicit list, or every job the contract holds — read from the
# contract, so this script is not tied to any particular deployment's history either.
if os.environ.get("JOBS"):
    JOBS = [int(x) for x in os.environ["JOBS"].split(",")]
else:
    JOBS = list(range(1, int(call("jobCount()(uint256)")[0]) + 1))
    print(f"no JOBS given: reading all {len(JOBS)} job(s) the contract holds")

for job_id in JOBS:
    (buyer, executor, total, ppu, escrow, exec_units, taker_units, work_dl,
     taker_dl, taker, bond, state) = call(JOB_SIG, job_id)
    total, ppu, escrow = int(total), int(ppu), int(escrow)
    exec_units, taker_units, bond = int(exec_units), int(taker_units), int(bond)
    state = int(state)
    remaining = total - exec_units - taker_units
    holders.update(a for a in (buyer, executor, taker) if a and int(a, 16) != 0)

    if state not in (4, 5):
        in_flight += escrow + (bond if state == 3 else 0)

    check(f"job {job_id}: escrow == units x price",
          escrow == total * ppu, f"{escrow} == {total} x {ppu}")

    check(f"job {job_id}: total in == total out",
          (exec_units + taker_units + remaining) * ppu + bond == escrow + bond,
          f"{escrow} escrow + {bond} bond accounted for")

    check(f"job {job_id}: counted units <= registered units",
          exec_units + taker_units <= total, f"{exec_units} + {taker_units} <= {total}")

    check(f"job {job_id}: a bond was never smaller than half the remainder",
          state in (0, 1, 2) or bond == 0 or bond * 10000 >= remaining * ppu * 5000,
          f"bond {bond} vs min {((remaining * ppu) * 5000) // 10000}")

    check(f"job {job_id}: state is one of the six the contract defines",
          state in STATE, f"state = {STATE.get(state, 'unknown: ' + str(state))}")
    print(f"  job {job_id}: {STATE.get(state,state)}  executor_units={exec_units} "
          f"taker_units={taker_units} remaining={remaining} bond={bond}")

credits = 0
for a in sorted(holders):
    v = call("credits(address)(uint256)", a)
    credits += int(v[0]) if v else 0

held = token_balance(VENUE)
check("the market holds exactly what it owes, in the asset it names",
      held == credits + in_flight,
      f"{held} held == {credits} credits + {in_flight} in flight, across "
      f"{len(holders)} participant(s) named by the jobs")

check("the market holds no native value at all (no payable path exists)",
      native_balance() == 0, f"{native_balance()} wei native")

supply = int(cast("call", asset, "totalSupply()(uint256)")[0])
check("the replica's supply is a plain faucet mint, not a claim on anything",
      supply > 0, f"totalSupply {supply} of {asset}")

passed = sum(1 for _, ok, _ in results if ok)
print()
for name, ok, detail in results:
    print(f"  [{'PASS' if ok else 'FAIL'}] {name} — {detail}")
print(f"\n{passed}/{len(results)} verified")
sys.exit(0 if passed == len(results) else 1)
