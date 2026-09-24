# Spectral

**Status (2026-09-24): deployed and executed on the public X Layer testnet — the full lifecycle
ran end to end in 30 public transactions, and `verify.py` re-reads the claims from the chain
and prints 10/10. 22 unit tests green, including a 256-run fuzz on conservation. The interface is
built and reads the deployed contract; it is not yet published on a host.**

Unfinished machine work becomes a tradeable, chain-settled instrument. A job is a set of
countable units. When the executor stops, the remaining units become a listed obligation that
another party can take over by posting a bond. Settlement is arithmetic over counted unit
receipts — no oracle, no jury, no admin, no leverage.

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
    forge test                       # 22 tests, incl. 256-run fuzz on conservation

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

`/` is the landing page. `/app` is the venue: open a job, count units, stall, list for takeover,
take over, claim. Both pages read the contract at render time; the landing deliberately carries
no chain data at all.

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

## What is real, and what is not

See `WHAT_IS_REAL.md` — written from the code, not from the design. Short version: the contract
and its invariants are real and tested; the venue runs against a public testnet with thirty
recorded transactions, and the interface is built and verified in a browser render. Source
verification on the explorer, hosting, and the recorded demo are pending.

## Non-goals

No leverage, no margin engine, no liquidation engine, no funding rates, no ADL, no cross
margin, no unified account, no order book, no oracle-priced settlement, no mainnet, no admin.
