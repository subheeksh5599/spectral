# OBLIGO — Production Checklist

Target: fully-executed score **9.0–9.2** (honest ceiling for this idea), with the two
externally-dependent items in §H being what push toward 9.4. Tick rule: a box is ticked only
when the artifact exists AND was verified by a command or a real transaction — never because
the code "should" work.

Chain: X Layer testnet 1952 (RPC `https://testrpc.xlayer.tech/terigon`, gas OKB).
No mainnet, no OKB stake, no OKX API key required for the mechanism.

---

## Gate 0 — Decisions recorded before code (no assumptions)

- [ ] G0.1 Product sentence frozen in README line 1: *unfinished machine work becomes a
      tradeable, chain-settled instrument; the obligation outlives the agent.*
- [ ] G0.2 Instrument resolution rule frozen: settles on **chain-counted unit receipts**
      (no oracle, no jury, no price feed in the settlement path).
- [ ] G0.3 Track + route recorded: primary track, participation route, team roster —
      written into README §Submission.
- [ ] G0.4 Scope cuts written into WHAT_IS_REAL.md as explicit non-goals: no leverage,
      no cross-margin, no funding, no ADL, no unified account, no CLOB, no slot auctions.
- [ ] G0.5 Admin confirmation in writing (Telegram) that testnet satisfies the track
      minimum, and whether a read-only mainnet price panel counts as the RWA integration.
      Store the quoted reply in `docs/admin-confirmation.md`.

## A — Mechanism and contracts (technical execution)

- [ ] A1 `Obligo` core: create job (units × pricePerUnit = escrow), submit unit receipts,
      declare stall, list obligation, take obligation with bond, settle, reclaim on failure.
- [ ] A2 Unit receipts are per-index and unique: no unit counted twice, no receipt overwritten.
- [ ] A3 Split arithmetic is exact by construction: escrow = pricePerUnit × totalUnits at
      creation, so no rounding dust exists anywhere.
- [ ] A4 Conservation invariant tested: total paid out == escrow + bond, in every terminal path.
- [ ] A5 Executor and taker units tracked separately, so the partial payout is derived,
      not asserted.
- [ ] A6 Terminal states are final: no path re-opens a settled or closed job.
- [ ] A7 No admin keys, no owner, no pause. Every transition is either the named party or
      permissionless-after-deadline.
- [ ] A8 Refusal paths are first-class and named: `StallNotPermitted`, `NoBondPosted`,
      `UnitAlreadyCounted`, `DeadlineNotReached`, `JobNotOpen` — each with its own test.
- [ ] A9 Deployed to X Layer testnet; contract address + deploy tx hash recorded in README.
- [ ] A10 Source verified on the testnet explorer (or the verification attempt + reason
      recorded honestly if the explorer does not support it).

## B — Proof ladder (the part that makes claims checkable)

- [ ] B1 `claims.json` — every product claim with its evidence pointer (tx hash, file, test).
- [ ] B2 `WHAT_IS_REAL.md` — per-feature table: Real (tested) / Real (not covered by tests) /
      Pending, written from the code, not from the design.
- [ ] B3 `pnpm verify` (or `forge script`) re-reads claims from chain and prints `N/N verified`.
- [ ] B4 Every receipt on chain traces to a real job and a real unit index in the UI.
- [ ] B5 A refusal demonstrated live: a state transition rejected on chain with the revert
      reason shown, not described.
- [ ] B6 Commit window artifact: dated commit list for the build period, referenced in README.

## C — No-mock compliance (hard gate)

- [ ] C1 `grep -rniE "mock|simul|sample|fake|dummy|hardcod|placeholder|for now|\?\? default"`
      over the shipped repo returns only explicitly labelled test-only fixtures.
- [ ] C2 Zero hardcoded addresses/tokens/RPCs in source: all from env or resolved from chain.
- [ ] C3 No "simulated market" venue language anywhere in UI, README, or narration
      (Exchange OS uses that term; our rules ban it).
- [ ] C4 Every number on screen is read from chain or from a live CLI call at render time.

## D — Product surface (user-transactable, not a read-only demo)

- [ ] D1 Wallet connect with automatic chain add/switch to 1952, params served from the API,
      not hardcoded in the client.
- [ ] D2 A stranger can: create a job, submit unit receipts, declare stall, take an obligation
      with a bond, settle — from the page, with their own wallet.
- [ ] D3 Faucet link present for testnet OKB.
- [ ] D4 Honest empty/error/not-configured states; no spinner pretending to work.
- [ ] D5 Live obligation board: open, stalled, listed, taken, settled — each row linking to
      the chain.
- [ ] D6 Read-only mainnet panel: real tokenized-stock prices via `onchainos market price`
      (free tier), labelled as read-only mainnet data, sourced live.

## E — Demo artifact

- [ ] E1 `docs/RUNOFSHOW.md` — timed beats, pre-flight, backup ladder of REAL artifacts.
- [ ] E2 2–4 minute video, generated from real captures and real tx hashes (scripted, not
      improvised), with the two money shots: the stall→takeover settlement, and the second
      failure closing by rule with no jury.
- [ ] E3 Every hash shown on screen exists on the testnet explorer.
- [ ] E4 Judge Q&A prep: the five hardest questions with answers, including "why not deploy
      on Exchange OS on mainnet?"

## F — Submission package

- [ ] F1 Public repo, clear README, accurate to code (fix code to match README where they
      disagree).
- [ ] F2 Contract addresses + technical links in the README.
- [ ] F3 Demo video linked in README and in the submission form.
- [ ] F4 Live product link that works from a clean browser with no login wall.
- [ ] F5 Declaration reviewed: every statement in the form is verifiable.
- [ ] F6 No prior-art/rival/sponsor names in docs, source, or tests.

## G — Adversarial pass (each item attacked, result recorded, not asserted)

- [ ] G1 Take over an obligation, then never finish → bond must move to the buyer by rule.
- [ ] G2 Submit the same unit index twice → refused with reason.
- [ ] G3 Submit a zero receipt hash → refused.
- [ ] G4 Try to take over before a stall is declared → refused.
- [ ] G5 Attempt to re-settle a settled job → refused.
- [ ] G6 Reentrancy probe on the settlement transfer.
- [ ] G7 Integer edge: 1 unit; 0-price unit; max uint overflow attempt.
- [ ] G8 Two takers race for one obligation → second refused.
- [ ] G9 Buyer tries to withdraw escrow mid-work → refused (rule stated in README).
- [ ] G10 Run all of G1–G9 on the deployed testnet contract, not only locally.

## H — The two items that separate 9.2 from 9.4 (external, cannot be forced)

- [ ] H1 A taker who is not us: one outside wallet takes an obligation and completes it.
      Evidence: their addresses and tx hashes, plus how they were invited (public call,
      testnet-community post, or the Telegram group).
- [ ] H2 Third-party read: the sponsor or an independent operator describes the mechanism in
      their own words (issue comment, group message, quote). Evidence: the quoted text.
- [ ] H3 If H1/H2 do not happen: state that plainly in WHAT_IS_REAL.md rather than implying
      adoption that did not occur.

## Definition of done

All of A–G ticked with evidence, H1/H2 attempted and their true status recorded, and these
commands green on the shipped commit:

    forge test                      # all tests pass
    forge script ... --rpc-url $XLAYER_TESTNET_RPC   # redeploy reproduces
    pnpm verify                     # claims re-read from chain, N/N
    grep -rniE "mock|simul|sample|fake|dummy|hardcod|placeholder" src app  # clean

## Non-goals (stated so nobody assumes them)

Leverage, margin engines, liquidation engines, funding rates, ADL, cross-margin, unified
accounts, order-book matching, oracle-priced settlement, mainnet deployment, Exchange OS
deployment, OKX agent identity (A2A), any paid API tier.
