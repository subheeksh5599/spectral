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
| Deployed to a public network | **Pending** | no deploy tx yet; key not provided |
| Source verification on an explorer | **Pending** | needs deployment |
| User interface (connect, create, count, stall, take, settle) | **Pending** | not started |
| Live obligation board | **Pending** | not started |
| Read-only tokenized-stock price panel | **Pending** | needs the CLI login |
| Demo video generated from real captures | **Pending** | no deployment to capture yet |
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
- Everything above is local-EVM evidence only until the testnet deployment lands.
