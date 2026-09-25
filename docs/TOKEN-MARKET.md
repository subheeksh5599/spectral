# The second market: the same state machine, denominated in a token

This is the part of the project that answers a fair objection. The main market escrows native
value (OKB on X Layer testnet), and native value cannot be a share. So this deployment of the
same contract escrows an **ERC-20 that is shaped like a tokenized equity** — and rather than
mock one, the token is a real ERC-20 that this project deployed on the same testnet, with real
transfers, real balances and real allowances.

## What the token is, and what it is not

`0x7E7789c15E2792798176533d8843935947732b3C` — `name()` returns `Testnet Equity Replica: TSLA`,
`symbol()` returns `tTSLA`, 18 decimals.

It **is**: a standard ERC-20 on X Layer testnet (chain 1952), deployed by this project, with an
open `mint()` faucet so anyone can obtain it, and with balances and approvals that behave
exactly like the ERC-20 the market code consumes.

It is **not**: an xStock, a Backed-issued asset, a Tesla share, a claim on anything, or an
investment of any kind. There is no issuer, no transfer agent, no redemption path and no price.
The name says "replica" and the contract says so in its first line of comments. It exists so
that the market can be denominated in a token that behaves like the asset it stands in for,
instead of in a number in a UI.

## The market

`0x232a35C819BEcf3D10eA24Aa3E7F9aC616B287B5` — `SpectralToken`, deployed with the equity as its
`asset`. The asset is `immutable`: this contract can never be repointed at another token.

The state machine is the one in the main market, unchanged: units are counted and an index can
never be counted twice, a stall is declarable, the obligation is listed, anyone may take it by
posting a bond of at least half the remaining escrow, a taker that fails forfeits that bond to
the buyer, settlement is arithmetic over counted units, and there is no owner, admin, oracle,
jury, pause or upgrade path. Two things differ, and both are in the source:

| | native market | this market |
|---|---|---|
| escrow and bond | `msg.value` | `transferFrom` — the allowance must cover it |
| extra requirement | — | `approve` the market before creating or taking |
| `takeObligation` | takes a payable bond | takes `(jobId, bondAmount)` |

## Receipts, on chain, 2026-09-25

Three distinct wallets, all real transactions, all status `success`:

| role | address |
|---|---|
| deployer + buyer | `0xA6cFa92Ee3CF71cb74773BEBeDd79ae01755de62` |
| executor | `0x79f92531dDfe27F03742117f43e94026Da540F37` |
| taker | `0x017C2e8785aDDE2Cac9a5527bf7C5bb729AaD16C` |

| step | transaction |
|---|---|
| deploy the equity | [`0x093debbe9519c83dba3756ef7b6e2ce24af49fc75482ec0fb81a0f21500ac3c1`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x093debbe9519c83dba3756ef7b6e2ce24af49fc75482ec0fb81a0f21500ac3c1) |
| deploy the market | [`0x1aaca8d99773fc9f9916e6431712ed95236e30ee4512c2fb53c0ce10b86ee620`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x1aaca8d99773fc9f9916e6431712ed95236e30ee4512c2fb53c0ce10b86ee620) |
| job 1 created (10 units) | [`0x72c52f0c599f278d55ae23ce24094188b586b8863a7e64460466e71cd9f3fd80`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x72c52f0c599f278d55ae23ce24094188b586b8863a7e64460466e71cd9f3fd80) |
| job 1 taken over, 2.5 tTSLA bond | [`0x6470798f2e1800c5bfebe8a44060b17d5452c10dee129b3a1801cc5a3eb8410a`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x6470798f2e1800c5bfebe8a44060b17d5452c10dee129b3a1801cc5a3eb8410a) |
| job 2 created (10 units) | [`0x7324d2f249132c91a646ae5d9f84a47124815b7f5e975cf8359f6c7b5e6cdb57`](https://www.okx.com/web3/explorer/xlayer-test/tx/0x7324d2f249132c91a646ae5d9f84a47124815b7f5e975cf8359f6c7b5e6cdb57) |
| job 2 taken over, 4.5 tTSLA bond | [`0xeaee7d4f00f6b30427f18c8a9a2414bbe14446a08f7598011b3a6be3fb64ba0e`](https://www.okx.com/web3/explorer/xlayer-test/tx/0xeaee7d4f00f6b30427f18c8a9a2414bbe14446a08f7598011b3a6be3fb64ba0e) |
| job 2 closed as failed | [`0xa0e145d413991f9d09a7828d4f81d578551a5b02bc31bd7310b5ebba0088fa53`](https://www.okx.com/web3/explorer/xlayer-test/tx/0xa0e145d413991f9d09a7828d4f81d578551a5b02bc31bd7310b5ebba0088fa53) |

31 transactions across blocks 41871109–41871298, gas used 3,609,687 (about 0.00016 OKB at the
0.043 gwei this chain charged). Every one of them is in
`broadcast/TokenMarket.s.sol/1952/run-latest.json` and `broadcast/TokenFailClose.s.sol/1952/run-latest.json`.

## What the two jobs demonstrate

**Job 1 — a stall that a taker rescues.** Escrow 10 tTSLA (10 units at 1 tTSLA). The executor
counted 5 units and stopped. It declared the stall and listed the remainder itself. A different
wallet took the obligation for the 2.5 tTSLA bond the contract asked for, finished the five
remaining units, and the job settled by arithmetic: 5 tTSLA to the executor, 5 tTSLA plus the
returned 2.5 tTSLA bond to the taker.

**Job 2 — a taker that fails.** Escrow 10 tTSLA. The executor counted 1 unit. The taker bought
the nine-unit remainder for a 4.5 tTSLA bond and then finished nothing. After the taker
deadline anyone could close it, and closing it moved the money exactly as specified: 1 tTSLA to
the executor for the unit it counted, 9 tTSLA of unearned escrow back to the buyer, and the
4.5 tTSLA bond forfeited to that same buyer — 13.5 tTSLA. The market held 14.5 tTSLA before the
close and 0 after the payouts.

## Re-verify it yourself

```bash
RPC_URL=https://testrpc.xlayer.tech/terigon \
VENUE=0x232a35C819BEcf3D10eA24Aa3E7F9aC616B287B5 JOBS=1,2 \
python3 verify_token.py
```

No key, no wallet, no file of truths: every line is a live read of the market and of the token
it names. It checks escrow arithmetic per job, that counted units never exceed registered units,
that the bond was never below half the remainder, that each job is in one of the six states the
contract defines, that the market's token balance is exactly its credits plus what is still in
flight, that the market holds no native value at all (this contract has no payable path), and
that the token supply is a plain faucet mint.

Read it from anywhere else with the same public board API the main market uses:

```bash
curl -s "https://spectral-venue.vercel.app/api/board?market=token"
node app/scripts/board-cli.mjs --rpc https://testrpc.xlayer.tech/terigon \
  --venue 0x232a35C819BEcf3D10eA24Aa3E7F9aC616B287B5 --symbol tTSLA
```

The venue page at `/app` shows this market as a read-only panel, with the same numbers, read
from that endpoint.

## Reproduce the run

Keys and amounts come from the environment; there are no defaults in the scripts.

```bash
export TOKEN_DEPLOYER_KEY=… TOKEN_BUYER_KEY=… TOKEN_EXECUTOR_KEY=… TOKEN_TAKER_KEY=…
export TOKEN_UNITS=10 TOKEN_PRICE_PER_UNIT=1000000000000000000 \
       TOKEN_WORK_WINDOW_SECONDS=1800 TOKEN_TAKER_WINDOW_SECONDS=90 \
       TOKEN_MINT_AMOUNT=1000000000000000000000

forge script script/TokenMarket.s.sol --rpc-url $XLAYER_TESTNET_RPC --broadcast --slow

# wait out TOKEN_TAKER_WINDOW_SECONDS, then close the failed job
export TOKEN_MARKET=… TOKEN_EQUITY=… TOKEN_JOB2=2
forge script script/TokenFailClose.s.sol --rpc-url $XLAYER_TESTNET_RPC --broadcast --slow
```

Before any of that, the whole thing runs on a local chain for free:

```bash
anvil &
export TOKEN_DEPLOYER_KEY=$LOCAL_DEPLOYER_KEY TOKEN_BUYER_KEY=$BUYER_KEY \
       TOKEN_EXECUTOR_KEY=$EXECUTOR_KEY TOKEN_TAKER_KEY=$TAKER_KEY
forge script script/TokenMarket.s.sol --rpc-url $LOCAL_RPC --broadcast
```

`test/SpectralToken.t.sol` covers the same paths against the same contract without a chain:
lifecycle, every refusal the contract defines, conservation fuzzed across mixed paths, and a
hostile ERC-20 that re-enters `claim()` from inside `transfer()` to show the credit is zeroed
before any transfer happens.
