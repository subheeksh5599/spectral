# The gates, run against the deployed contract

Everything below was executed against the live deployment
[`0x2899eb0972f86cc90d054d19a5816233d9af56d9`](https://www.okx.com/web3/explorer/xlayer-test/address/0x2899eb0972f86cc90d054d19a5816233d9af56d9)
on X Layer testnet (chain 1952). Nothing here is a local run, a mock, or a description of
what the code "would" do.

## The lifecycle, mined

`script/LiveGatesOpen.s.sol` then `script/LiveGatesClose.s.sol`. Both read the actor keys from
the environment; neither has a default.

| # | Step | Transaction |
|---|---|---|
| 1 | buyer opens job 3 — 6 units at 0.0005 OKB, escrow 0.003 OKB | `0x6b41bbe5a32bbce0d895078af81d10bff36331d510908b5fe96fab71e4ab295c` |
| 2 | executor counts unit 0 | `0x339df9dd6337732c7bedb5666bccd370a25c38a254ee4dabc1f3aa38e9fc08a1` |
| 3 | buyer opens job 4 at price 0 (the zero-price edge, mined on purpose) | `0xba6b9fa0bd1e956d45b11894962fe86631a25b261f9f2c5fc26f4d9a747bfa8b` |
| 4 | executor declares the stall | `0x81b6a787d1e245363e900f281beea2f9e2ab4017f4bddf34ff63445d0eec9067` |
| 5 | executor lists the remainder, taker window 180s | `0xf0b89a032682508ba120639ac456810d4dfd38d3d6971d3e76ec28bb01b40ff4` |
| 6 | taker takes over against a 0.00125 OKB bond | `0x8bf1a646f7cb72145c0932d5c3422249af5cf0edccc7b0de91ec9a1477f3cdf1` |
| 7 | **the taker never finishes** — after the window elapsed, the buyer closes it by rule | `0x822a6c35fd4344c8348ad865e290163e9a634d7114c3901d10e8525136688c49` |

**G1, on chain.** Job 3 went `Taken → Closed` with no taker unit counted, and the money moved by
rule alone — no admin call, no dispute, no discretion:

```
buyer      credit 0.00375 OKB   (5 uncounted units 0.0025 + the forfeited bond 0.00125)
executor   credit 0.00050 OKB   (the 1 unit it actually counted)
taker      credit 0        OKB  (it counted nothing, so it is owed nothing)
--------------------------------
credits sum 0.00425  ==  venue balance 0.00425   -> CONSERVED
```

The conservation line was read from the deployed contract, not computed from the script.

## The refusals, evaluated by the deployed bytecode

Each attempt was made with `eth_call` against the live contract, so the state checks ran in the
deployed bytecode and the revert data is the contract's own. No transaction is needed to prove a
refusal, and none of the state changed. Raw output is in `docs/live-gates-raw.json`.

| Gate | The attempt | The contract answered |
|---|---|---|
| G2 | count unit 0 a second time | `UnitAlreadyCounted()` |
| G3 | count a unit with a zero receipt hash | `EmptyReceipt()` |
| G4 | count unit 99 of a 6-unit job | `UnitOutOfRange()` |
| G5 | a stranger counts a unit | `NotExecutor()` |
| G7 | open a job whose escrow calculation overflows `uint256` | arithmetic panic `0x4e487b71` |
| G8 | a second taker takes a job already taken | `NothingToTake()` |
| — | declare a stall on a job already taken | `AlreadyStalled()` |

G6 (reentrancy) and the zero-price behaviour are covered by the test suite rather than by a live
call, because both are properties of the bytecode that a state-changing call cannot demonstrate
better: `testReentrantClaimCannotDrainAnotherJob` has an attacker claim, re-enter from the payout
callback, and fail to touch a second job's money, and `testZeroPriceJobIsVacuousNotUnsafe` records
that a price of zero escrows nothing and settles to nothing.

**G9** is structural: there is no function that lets a buyer withdraw escrow mid-work. The only
paths that move money are `_settle` and `closeFailed`, both of which run when the unit count
decides them, and `claim`, which only pays a credit that already exists. The absence is checked by
`testBuyerCannotWithdrawMidWork`.

## Why the split into two scripts

A live chain's clock cannot be warped. The first attempt at this ran `vm.warp` and the deadline
rule never fired, which is exactly the kind of thing that produces a demo where the interesting
part silently doesn't happen. So the run is split: part one mines the state, the taker window
elapses in real time (180 seconds here), part two closes it and asserts the window has passed
before broadcasting.

## Reproduce it

```bash
VENUE=<deployed address> GATE_UNITS=6 GATE_PRICE_PER_UNIT_WEI=500000000000000 \
GATE_TAKER_WINDOW_SECONDS=180 \
forge script script/LiveGatesOpen.s.sol --rpc-url $XLAYER_TESTNET_RPC --broadcast --slow

# wait out the window, then
VENUE=<deployed address> GATE_JOB_ID=<the job id printed above> \
forge script script/LiveGatesClose.s.sol --rpc-url $XLAYER_TESTNET_RPC --broadcast --slow
```
