# The five hardest questions, answered from the code

## 1. "Why not deploy on Exchange OS on mainnet?"

Because the venue does not need an exchange, and the testnet deployment is where the mechanism is
provable today.

Exchange OS is a live venue with shared accounts, margin and matching — infrastructure for
*markets*. Spectral is not a market: it is a set of rules that decides who is paid for counted
units, and a listing window. Using Exchange OS would mean adopting an admin-gated deployment, a
deployer stake in OKB, and a contract interface that lives in an unpublished protocol
specification. None of that makes the mechanism truer.

What it would change is the evidence. Every transaction here is public, the deployment is
exercised end to end on it (`docs/LIVE-GATES.md`), and anyone can re-read the claims and see them
hold (`verify.py`). A mainnet deployment under a staged rollout would be *harder* to check, not
easier, and it would cost real money to put the same numbers on screen. The README states the
mainnet path as the next step rather than pretending it is done.

## 2. "Who decides that a unit of work is real?"

The contract decides what counts as a *counted* unit, and nothing decides quality.

A unit becomes counted when the party currently responsible for the job — the executor while the
job is open, the taker once it is taken over — presents a per-unit receipt, at an index that has
not been used before, for an index inside the job's range. The receipt hash is computed in the
caller's browser and stored on chain per index. A repeat at the same index reverts with
`UnitAlreadyCounted()`; a blank receipt reverts with `EmptyReceipt()`; an out-of-range index
reverts with `UnitOutOfRange()`. All three were attempted against the deployed contract and were
refused by it (`docs/LIVE-GATES.md`).

The honest limit: the contract cannot judge whether a receipt corresponds to *good* work. That is
the buyer's acceptance rule, and it is stated as a limit in `WHAT_IS_REAL.md` rather than hidden.
What the mechanism guarantees is narrower and checkable: the count is the record, and money
follows the count.

## 3. "What stops someone taking a job over and then stalling?"

The bond and the deadline, both fixed before anyone takes anything.

A taker posts at least 50% of the remaining escrow as a bond (the contract reverts with
`BondTooSmall(required)` below that, and the required amount is readable from `requiredBond`). When
they take it, a taker deadline is written with the listing. If that deadline passes with units
still uncounted, *anyone* may call `closeFailed`: the taker is paid only for units it actually
counted, and the bond plus the unearned remainder go to the buyer.

There is no dispute to file and no jury to persuade — the rule simply executes. That is what job 3
in `docs/LIVE-GATES.md` demonstrates on the deployed contract: the taker counted nothing, so it was
owed nothing, and the bond moved to the buyer with no administrator involved. The same path was
walked with real money on job 2 earlier in the deployment's life.

## 4. "Could this be drained, or double-counted?"

Both were attacked, and both are covered.

A reentrancy attack is the obvious shape: earn a genuine credit on one job, then re-enter `claim()`
from the payout callback while the contract still holds another job's money.
`testReentrantClaimCannotDrainAnotherJob` constructs exactly that attacker, claims, re-enters from
`receive()`, and asserts the re-entry was refused, that the attacker received only its own credit,
that its credit was consumed once, and that the other job's balance and credit are untouched. It
passes because `claim()` zeroes the credit before it transfers.

Double-counting is refused per index on chain (see question 2), and the arithmetic is checked by a
256-run fuzz plus an invariant suite: every wei is either owed as a credit or still locked in a live
job, and the live deployment was re-read with `verify.py` to confirm the same holds there
(`credits sum == venue balance`).

## 5. "Is anything here simulated?"

No, and the places where that could quietly become untrue are named.

There is no seeded state: the only jobs on the deployment are the ones the lifecycle scripts
created, and every figure on the dashboard is read from the chain when the page renders. The three
photographs that shipped with the frontend were deleted — a landing page showing unrelated stock
photography would have implied clients and a company. The landing page deliberately carries no
chain data at all; its numbers (six states, four refusals, zero reporters) are properties of the
contract source, each one checked against the code.

The gaps are listed rather than glossed: source verification on the explorer is **not done** (the
credential route is gated, so it is not claimed anywhere), the OpenAI-shaped extraction path is not
used, and the demo video and hosting are the two remaining artifacts. `WHAT_IS_REAL.md` carries
that table, written from the code rather than from the design.

## Bonus: "Why is the project called Spectral and the contract an obligation venue?"

The name describes the property the mechanism enforces: a job's obligation stays payable after the
machine that accepted it stops. The word replaced an earlier working name and the rename is in the
history; only the deployed instance predates it, and that instance differs from the source by the
contract's name and nothing else.
