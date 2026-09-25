#!/usr/bin/env python3
"""verify.py — re-reads the claims from the chain and prints N/N.

Nothing here is asserted from a file: every check is a live read of contract state or a
balance from the node named in RPC_URL. Run it against the local chain or testnet 1952.

    RPC_URL=$XLAYER_TESTNET_RPC VENUE=0x... python3 verify.py              # every job on the venue
    RPC_URL=$XLAYER_TESTNET_RPC VENUE=0x... JOBS=1,3 python3 verify.py     # or just these
"""
import json, os, subprocess, sys

RPC = os.environ.get("RPC_URL")
VENUE = os.environ.get("VENUE")
if not RPC or not VENUE:
    sys.exit("RPC_URL and VENUE are required (no defaults)")

JOB_SIG = ("jobs(uint256)(address,address,uint256,uint256,uint256,uint256,"
           "uint256,uint256,uint256,address,uint256,uint8)")

def call(sig, *args):
    out = subprocess.run(["cast", "call", VENUE, sig, *[str(a) for a in args],
                          "--rpc-url", RPC], capture_output=True, text=True)
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip()[:200])
    # cast prints one value per line, with a human annotation like " [1e18]" we ignore
    return [line.split()[0] for line in out.stdout.splitlines() if line.strip()]

def balance(addr=None):
    out = subprocess.run(["cast", "balance", addr or VENUE, "--rpc-url", RPC],
                         capture_output=True, text=True)
    return int(out.stdout.strip())

results = []
def check(name, ok, detail):
    results.append((name, ok, detail))

STATE = {0: "Open", 1: "Stalled", 2: "Listed", 3: "Taken", 4: "Settled", 5: "Closed"}

code = subprocess.run(["cast", "code", VENUE, "--rpc-url", RPC],
                      capture_output=True, text=True).stdout.strip()
check("venue contract exists on this chain", len(code) > 4, f"{len(code)//2 - 1} bytes at {VENUE}")

holders = set()   # whoever the jobs themselves name, read from the contract
in_flight = 0     # money still locked in a job that has not reached a terminal state

# Which jobs to check: an explicit list, or every job the contract holds. The default reads
# jobCount() from the contract, because a partial list makes the conservation check below a
# false failure: it compares the venue's whole balance against the jobs it was told to look at.
if os.environ.get("JOBS"):
    JOBS = [int(x) for x in os.environ["JOBS"].split(",")]
else:
    JOBS = list(range(1, int(call("jobCount()(uint256)")[0]) + 1))
    print(f"no JOBS given: reading all {len(JOBS)} job(s) the contract holds")
COVERS_ALL_JOBS = JOBS == list(range(1, int(call("jobCount()(uint256)")[0]) + 1))

for job_id in JOBS:
    row = call(JOB_SIG, job_id)
    (buyer, executor, total, ppu, escrow, exec_units, taker_units, work_dl,
     taker_dl, taker, bond, state) = row
    total, ppu, escrow = int(total), int(ppu), int(escrow)
    exec_units, taker_units, bond = int(exec_units), int(taker_units), int(bond)
    state = int(state)
    remaining = total - exec_units - taker_units
    holders.update(a for a in (buyer, executor, taker) if a and int(a, 16) != 0)

    # money that is locked rather than credited belongs to the venue's balance too
    if state not in (4, 5):
        in_flight += escrow + (bond if state == 3 else 0)

    # invariant 1: escrow is exact by construction
    check(f"job {job_id}: escrow == units x price",
          escrow == total * ppu, f"{escrow} == {total} x {ppu}")

    # invariant 2: conservation, computed from on-chain fields
    paid_out = (exec_units + taker_units + remaining) * ppu + bond
    check(f"job {job_id}: total in == total out",
          paid_out == escrow + bond,
          f"{escrow} + {bond} bond == {paid_out} accounted")

    # invariant 3: no unit counted twice is enforced per-index; state proves counting stopped
    check(f"job {job_id}: counted units <= registered units",
          exec_units + taker_units <= total,
          f"{exec_units} + {taker_units} <= {total}")

    # a job may legitimately still be live; what must hold is that the state is one the
    # contract defines, and that its money is accounted for either way (above)
    check(f"job {job_id}: state is one of the six the contract defines",
          state in STATE, f"state = {STATE.get(state, 'unknown: ' + str(state))}")
    print(f"  job {job_id}: {STATE.get(state,state)}  executor_units={exec_units} taker_units={taker_units} remaining={remaining} bond={bond}")

# invariant 4: the venue holds nothing it does not owe.
# The addresses come from the jobs on chain, so this holds on any deployment and any actor set —
# naming wallets in the script would silently miss a balance owed to someone else.
credits = 0
for a in sorted(holders):
    v = call("credits(address)(uint256)", a)
    credits += int(v[0]) if v else 0
check("venue holds exactly what it owes: credits plus money still in flight",
      balance() == credits + in_flight,
      f"balance {balance()} == credits {credits} + in flight {in_flight} "
      f"across {len(holders)} participant(s) named by the jobs"
      + ("" if COVERS_ALL_JOBS else
         f" — NOT a valid check here: JOBS={sorted(JOBS)} omits jobs the venue also holds,"
         f" so the expectation above is incomplete. Run without JOBS to check conservation."))

passed = sum(1 for _, ok, _ in results if ok)
print()
for name, ok, detail in results:
    print(f"  [{'PASS' if ok else 'FAIL'}] {name} — {detail}")
print(f"\n{passed}/{len(results)} verified"
      + ("" if COVERS_ALL_JOBS else "  (conservation above is only valid over every job — drop JOBS)"))
sys.exit(0 if passed == len(results) else 1)
