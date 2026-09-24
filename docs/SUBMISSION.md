# The submission form, answered

Everything below is a statement that can be checked against something in this repository or on the
public chain. No claim here depends on trusting the author.

## One-line summary

> A job is a set of countable units. When the executor stops, the units it never counted are listed
> for anyone else to finish against a bond, and settlement is arithmetic over the units that were
> counted — no oracle, no jury, no admin key.

## What it is, in three sentences

Spectral turns unfinished work into a transferable obligation. Each unit counted on chain is paid
for, and whatever the first party left behind becomes a listed obligation that a second party can
take over by posting at least half of the remaining escrow as a bond. If that second party misses
its deadline, the bond moves to the buyer by rule and the case closes without anyone being asked to
judge it.

## What is verifiable, and how

| Statement | Verify it with |
|---|---|
| The contract is deployed and has been executed end to end on public testnet | [`docs/RECEIPTS.md`](RECEIPTS.md) — every transaction with an explorer link |
| A taker who counts nothing is owed nothing, and the bond goes to the buyer | [`docs/LIVE-GATES.md`](LIVE-GATES.md) — job 3, closed by rule, with the credit arithmetic read back from the chain |
| Seven invalid actions are refused by the deployed bytecode, with the contract's own reasons | [`docs/LIVE-GATES.md`](LIVE-GATES.md) — `UnitAlreadyCounted`, `EmptyReceipt`, `UnitOutOfRange`, `NotExecutor`, `NothingToTake`, `AlreadyStalled`, and an arithmetic overflow |
| The invariants hold under adversarial tests, not just happy paths | `forge test` — **260 tests, 0 failures**: 235 generated conformance-matrix cells (states x operations x actors), a 256-run conservation fuzz, integer-edge cases, and a constructed reentrancy attacker |
| The claims in this README are true of the chain, not of the author's memory | `verify.py` — re-reads each claim from the contract and prints `10/10` |
| The work was done inside the build window | [`docs/COMMIT-WINDOW.md`](COMMIT-WINDOW.md) |

## Links

- Repository: this one. `README.md` is accurate to the code; where they disagreed, the code was
  changed.
- Deployed contract:
  `0x2899eb0972f86cc90d054d19a5816233d9af56d9` on X Layer testnet (chain 1952)
- Repository: https://github.com/subheeksh5599/spectral (public, no login)
- Live product: **https://spectral-venue.vercel.app** — landing at `/`, venue at `/app`, no login wall. Verified
  anonymously: both routes 200, `/api/config` serving the real chain values, and the venue reading
  four jobs off the contract in a browser with no wallet installed.
- Interface source: `app/` — Next.js, run locally with `cd app && npm install && npm run dev`.
- Demo video: not recorded yet. Stated, not implied.

## The declaration

> I built this during the build window. The contract, the tests, the deployment, the interface and
> the documentation are my own work. Where a thing is not finished — source verification on the
> explorer, a hosted URL, the recorded demo — this repository says so in `WHAT_IS_REAL.md` rather
> than implying otherwise. The frontend reuses a design system from an earlier project of mine; the
> photographs and the copy that shipped with it were removed, and every string on the page
> describes this contract. No number on any screen is seeded, mocked or simulated: the landing page
> carries no chain data at all, and the venue reads the contract when it renders.

## What I would say if asked "what are you least sure about?"

Three things, in order:

1. **Whether a second party would really take over a stalled obligation in production.** The
   economics are sound — the remainder is worth more to whoever is cheaper at finishing it, and the
   bond makes stalling expensive — but no one outside this build has taken one over yet. The
   mechanism is exercised; the market for it is not.
2. **The acceptance rule.** The contract counts units and refuses duplicates, but it cannot judge
   whether a receipt is *good* work. That belongs to the buyer, and it is stated as a limit.
3. **The deployed instance predates the project's rename.** Its bytecode differs from the source by
   the contract's name and nothing else, and the difference is recorded rather than hidden.
