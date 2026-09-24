# Obligo

**Status (2026-09-24): core venue contract complete and tested on a local EVM; not yet
deployed to a public network; no user interface yet.**

Unfinished machine work becomes a tradeable, chain-settled instrument. A job is a set of
countable units. When the executor stops, the remaining units become a listed obligation that
another party can take over by posting a bond. Settlement is arithmetic over counted unit
receipts — no oracle, no jury, no admin, no leverage.

## Why

Today, when an agent stops mid-job, the only outcomes are a full refund or a dispute. Partial
work has no representation, and the work already done is thrown away. Obligo makes the
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

## Deployments

| network | chain id | address | tx |
|---|---|---|---|
| local (anvil) | 31337 | — | tests only |
| testnet | 1952 | _pending_ | _pending_ |

## What is real, and what is not

See `WHAT_IS_REAL.md` — written from the code, not from the design. Short version: the
contract and its invariants are real and tested locally; public-network deployment, the user
interface, and the demo artifact are pending.

## Non-goals

No leverage, no margin engine, no liquidation engine, no funding rates, no ADL, no cross
margin, no unified account, no order book, no oracle-priced settlement, no mainnet, no admin.
