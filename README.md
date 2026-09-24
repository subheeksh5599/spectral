# Spectral

**Unfinished machine work becomes a tradeable, chain-settled instrument.** A job is a set of
countable units. When the executor stops, the remaining units become a listed obligation that
anyone can take over by posting a bond. Settlement is arithmetic over counted unit receipts.

**Repository:** https://github.com/subheeksh5599/spectral · **Live:** https://spectral-venue.vercel.app

## The claims

Every one of these is checkable in this repository, against a public chain, in minutes.

- **There is no key that can move money.** No owner, no admin, no oracle, no jury, no pause, no
  upgrade path, no parameter to tune. Not "renounced" — never written. `owner`, `admin`, `oracle`
  and `jury` appear in the source exactly once, in the comment that says they do not exist.
- **260 tests, 0 failures.** 235 of them are a generated conformance matrix: every one of the six
  states crossed with every operation crossed with every actor, each asserting the exact error
  selector or the exact resulting state. Plus a 256-run conservation fuzz, integer-edge cases, and
  a constructed reentrancy attacker that is given a real credit and then re-enters mid-payout.
- **The contract refused us seven times on the deployed bytecode.** Not a local copy — the live
  deployment, each refusal carrying the contract's own reason: `UnitAlreadyCounted()`,
  `EmptyReceipt()`, `UnitOutOfRange()`, `NotExecutor()`, `NothingToTake()`, `AlreadyStalled()`,
  and an arithmetic panic. A guarantee you never tested is a wish.
- **Conservation is arithmetic, not a promise.** Every wei is either owed as a credit or still
  locked in a live job — in every terminal path, asserted over random workloads rather than stated
  in prose. The venue cannot be insolvent by construction, and cannot pay out more than it took in.
- **The venue cannot be bribed, and cannot be argued with.** A taker who counts nothing is owed
  nothing; the bond it posted moves to the buyer. No administrator decides that. The rule ran live.
- **Every figure on the screen comes off a public chain.** No database, no indexer, no cache of
  record. `verify.py` ignores our files and re-derives the claims from the chain, printing N/N.
- **Partial work finally has a representation.** Before this, when an agent stopped mid-job the only
  outcomes were a full refund or a dispute. Now the remainder is priced by whoever takes it, and
  the work already done is paid for by count rather than thrown away.

**Status (2026-09-24): deployed and executed on the public testnet** — the full lifecycle ran end
to end, `verify.py` re-derives the claims from the chain, and the interface is live and reading
the contract. The recorded demo is the one artifact not yet in this repository.

## Why

Today, when an agent stops mid-job, the only outcomes are a full refund or a dispute. Partial
work has no representation, and the work already done is thrown away. Spectral makes the
remaining obligation a first-class object: it is listed, priced by whoever takes it, bonded,
and settled by the count of finished units.

## Mechanism

    createJob        buyer escrows units x pricePerUnit (exact, no rounding dust)
    countUnit        the responsible party counts one finished unit with its receipt hash
    declareStalled   executor any time; anyone after workDeadline
    listObligation   permissionless
    takeObligation   a taker posts a bond (>= 50% of the remaining escrow)
    countUnit        the taker counts the remaining units
    ------- all units counted -------
    settle           executor paid for the units it counted; taker paid the remainder + bond
    ------- or the taker fails -------
    closeFailed      executor paid for its units, taker paid for its units, buyer refunded the
                     remainder AND receives the forfeited bond

Conservation holds in every terminal path: every wei is either owed as a credit or still
locked in a live job. That is asserted by a fuzzed invariant test, not by prose.

No owner, no pause, no upgrade path. Every transition is either the named party or
permissionless after a deadline.

## Run it

    forge build
    forge test                       # 260 tests, 0 failures (see the claims above)

    # deploy (testnet only; the key comes from the environment, there is no default)
    cp .env.example .env             # then fill DEPLOYER_PRIVATE_KEY
    forge script script/Deploy.s.sol --rpc-url $XLAYER_TESTNET_RPC --broadcast

Chain: testnet chain id 1952 · RPC `https://testrpc.xlayer.tech/terigon` · gas token OKB
Faucet: https://web3.okx.com/xlayer/faucet

## The interface

Next.js 16, app router. One design system for both surfaces, and the chain values are served at
runtime from the environment — no chain id, RPC or contract address is hardcoded in the client.

    cd app
    npm install
    npm run dev            # http://localhost:5173 (landing)  ·  /app (the venue)

    npm run build && npm start        # production

Live: **https://spectral-venue.vercel.app** · `/` is the landing page · `/app` is the venue — open a job, count units,
stall, list for takeover, take over, claim. Both pages read the contract at render time; the
landing deliberately carries no chain data at all. The deployment is a Next.js server (the chain
config is served at runtime from `/api/config`, so no chain value is baked into the client), which
is why it is hosted on Vercel rather than as a static export.

## Deployments

| network | chain id | address | evidence |
|---|---|---|---|
| local (anvil, real EVM) | 31337 | `0x057ef64E23666F000b34aE31332854aCBd1c8544` | 30 tx hashes in `docs/RECEIPTS.md`, `verify.py` 10/10 |
| **testnet** | **1952** | [`0x2899eb0972f86cc90d054d19a5816233d9af56d9`](https://www.okx.com/web3/explorer/xlayer-test/address/0x2899eb0972f86cc90d054d19a5816233d9af56d9) | 30 public tx in `docs/RECEIPTS.md`, `verify.py` 10/10 on chain |

## Verify it yourself

    # re-reads the claims from the chain and prints N/N (no file is trusted)
    RPC_URL=https://testrpc.xlayer.tech/terigon VENUE=0x2899eb0972f86cc90d054d19a5816233d9af56d9 JOBS=1,2 python3 verify.py
    # -> 10/10 verified (public chain)

Live refusals, decoded: counting the same unit twice reverts with `UnitAlreadyCounted()`
(`0xf61e63c2`); a wallet that is not the responsible party reverts with `NotExecutor()`
(`0xc32d1d76`). Both on chain, both recorded.

The seven refusals attempted against the **deployed** contract (not a local copy), each with the
contract's own revert reason, are tabulated in [`docs/LIVE-GATES.md`](docs/LIVE-GATES.md) — along
with the money path of a job closed by rule, where a taker who counted nothing was owed nothing and
the bond moved to the buyer with no administrator involved.

## What is real, and what is not

See `WHAT_IS_REAL.md` — written from the code, not from the design. Short version: the contract
and its invariants are real and tested; the venue runs against a public testnet with thirty
recorded transactions, and the interface is built and verified in a browser render. Source
verification on the explorer, hosting, and the recorded demo are pending.

## Where the evidence is

Everything the claims above rest on is in this repository, and none of it asks to be trusted:

| Artifact | Where |
|---|---|
| The mechanism and its limits | `README.md`, `WHAT_IS_REAL.md` |
| The gates, run against the deployed contract | [`docs/LIVE-GATES.md`](docs/LIVE-GATES.md) |
| Transaction receipts with explorer links | [`docs/RECEIPTS.md`](docs/RECEIPTS.md) |
| The build window, as the repository records it | [`docs/COMMIT-WINDOW.md`](docs/COMMIT-WINDOW.md) |
| The five hardest questions, answered from the code | [`docs/JUDGE-QA.md`](docs/JUDGE-QA.md) |
| Re-read the claims yourself | `verify.py` |
| The interface | `app/` — Next.js, `/` landing and `/app` venue |

## Non-goals

No leverage, no margin engine, no liquidation engine, no funding rates, no ADL, no cross
margin, no unified account, no order book, no oracle-priced settlement, no mainnet, no admin.
