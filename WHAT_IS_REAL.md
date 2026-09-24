# What is real, and what is not

Written from the code at commit `HEAD`, not from the design. Every "real" row names the test
that covers it.

| Feature | Status | Evidence |
|---|---|---|
| Job creation with exact escrow (units × price) | **Real — tested** | `testCreateRequiresExactEscrow`, `testCreateRejectsZeroUnits` |
| Unit counting with unique per-index receipts | **Real — tested** | `testUnitCannotBeCountedTwice`, `testZeroReceiptRefused`, `testOutOfRangeUnitRefused` |
| Only the responsible party may count | **Real — tested** | `testStrangerCannotCount` |
| Stall rules (executor any time, anyone after deadline) | **Real — tested** | `testExecutorMayStallImmediately`, `testStrangerCannotStallBeforeDeadline`, `testAnyoneMayStallAfterDeadline` |
| Permissionless listing of the remaining obligation | **Real — tested** | `testCannotTakeBeforeStall` |
| Takeover with a minimum bond (≥50% of remaining escrow) | **Real — tested** | `testCannotTakeWithoutBond`, `testSecondTakerRefused` |
| Split settlement: executor paid for counted units, taker paid remainder + bond | **Real — tested** | `testStallThenTakeoverCompletes`, `testFullCompletionByExecutor` |
| Taker failure: bond forfeits to the buyer, remainder refunded | **Real — tested** | `testTakerFailureForfeitsBondToBuyer` |
| Conservation: every wei is owed (credit) or locked in a live job | **Real — fuzzed** | `testFuzzConservation` (256 runs), asserted in 6 terminal-path tests |
| Terminal states are final | **Real — tested** | `testNoResettleAfterSettlement`, `testCannotCloseASettledJob` |
| Buyer cannot withdraw mid-work | **Real — tested** | `testBuyerCannotWithdrawMidWork` |
| Pull-payment claims | **Real — tested** | `testClaimPaysOut` |
| Full lifecycle on a live chain (deploy → stall → takeover → settlement → failure close → claims) | **Real — executed** | 30 tx hashes in `docs/RECEIPTS.md`; `verify.py` prints 10/10 against the chain |
| Live refusal enforcement on chain | **Real — executed** | duplicate unit → `UnitAlreadyCounted()` `0xf61e63c2`; non-party → `NotExecutor()` `0xc32d1d76` |
| Conservation, re-read from chain fields rather than from tests | **Real — executed** | `verify.py` "total in == total out" per job |
| Deployed to a public network | **Real — live** | X Layer testnet 1952, `0x2899eb0972f86cc90d054d19a5816233d9af56d9`, 30 public transactions |
| Source verification on an explorer | **Pending** | explorer source verification needs an OKLink API key; not attempted, and not claimed |
| Landing page — papercraft system | **Real — verified in a browser render** | `/` uses the warm-paper design taken from the operator's own earlier frontend: `#f5f1e4` canvas, `#8ed462` hero curtain with a 48px bottom radius, coral `#ff705d` action pills, 50px sticker cards with the papercraft shadow, `#f5e211` footer at a 48px top radius, floating blur pill nav; display type measured at 102.4px Plus Jakarta Sans 600 with -4.096px tracking; all 12 scroll-reveal nodes fire; Plus Jakarta Sans self-hosted (4 weights) |
| Dashboard | **Real — verified in a browser render** | `/app` keeps the dense product system: 240px `#FAFAFA` sidebar, 40px data rows, 4 KPI cards, 2 real rows read from the contract; unaffected by the landing's Tailwind import (no preflight, scoped canvas) |
| Reading the venue with no wallet installed | **Real — verified** | the board read 2 jobs, states `Settled`/`Closed`, 17 of 20 units counted, straight from testnet RPC; the wallet is only needed to sign |
| Transaction lifecycle toasts | **Real on the confirmed and refused paths** | pending → confirmed with an explorer link; refusals persist until dismissed; exercised against the deployed contract |
| No stock photography, no borrowed copy | **True by construction** | the design language was reused; the photographs and marketing copy that shipped with it were not — every string on the page describes this contract |
| Driving every step from the page with your own wallet | **Built, not yet exercised by anyone but the author** | see CHECKLIST D2 |
| Hosted public URL | **Pending** | not deployed yet |
| Live obligation board | **Pending** | not started |
| Read-only tokenized-stock price panel | **Pending** | needs the CLI login |
| Demo video generated from real captures | **Pending** | deployment exists now; capture not made |
| Third-party taker (someone outside this repo) | **Not attempted** | the 9.2→9.4 condition; see CHECKLIST §H |
| Sponsor or independent third-party description of the mechanism | **Not attempted** | see CHECKLIST §H |

## Honest limits of the mechanism

- **Units must be countable.** The mechanism is only honest for work whose completion produces
  a per-item artifact. A "write a report" job has no units and belongs elsewhere.
- **Receipts are opaque hashes.** The contract counts them and refuses duplicates; it cannot
  judge whether a receipt corresponds to *good* work. That judgement lives with the buyer's
  acceptance rule, which is out of scope for slice 1 and must be stated wherever the product
  is described.
- **No leverage means no liquidation engine.** A taker who stops working loses the bond by a
  deadline rule; there is no health factor, no partial liquidation, no cross-margin.
- **Bond size is a constant (50% of the remaining escrow).** Not tuned, not modelled.
- Testnet transactions are public and linkable in the explorer; unit-test rows are local-EVM evidence.
