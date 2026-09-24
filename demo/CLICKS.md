# RUN OF SHOW — Spectral (target ~120s, website only, no wallet needed)

Everything on screen is the product in a browser: no terminal, no editor, no repository view. The
transactions are shown where the audience can check them — as the states and receipts the page
reads off the contract, and on the explorer tab when a hash matters. Nothing is mocked; if the
network is flaky, use the ladder at the bottom rather than inventing a screen.

**This walkthrough does not connect a wallet, on purpose.** The venue reads every number without
one, so nothing here is blocked by a wallet popup. A wallet vendor may warn on this hostname — it
is a new free-hosting subdomain that asks to connect, which is exactly the pattern drainers use,
and that is a fact about the host, not a defect in the product. The read path needs nothing, so
the walkthrough stays on it. If you do want a live transaction on camera, expect that warning once
and know that no claim in this repository depends on it.

## Pre-flight (T-10 min)

- [ ] The app is up: `https://spectral-venue.vercel.app` (`/api/config` answers there), or `npm run dev` in `app/`
- [ ] `python3 verify.py` prints its N/N against the deployed address, so the numbers on screen are re-derived, not remembered
- [ ] `forge test` green on the exact commit being demoed
- [ ] Explorer tabs pre-opened for the jobs the board shows, so nothing is typed live
- [ ] Browser zoom at 100%, window ≥ 1400px wide
- [ ] Source verification is NOT claimed anywhere — do not imply it on camera
- [ ] Know the five jobs on the board before you start: `#1 Settled 10/10`, `#2 Closed 7/10`, `#3 Closed 1/6`, `#4 Open 0/3`, `#5 Settled 3/3`

## Beats

**0:00–0:20 — The landing, first impressions.** Open `/`. Let it scroll: the headline, the rules, the
three metric cards, the two case cards. Read the middle card's own line rather than paraphrasing it:
*"Four refusals the contract makes on its own: wrong escrow, a unit counted twice, a bond below half
the remainder, a stall declared twice."* Narrate the one sentence: *work that was never finished
becomes a counted obligation.* Note out loud that this page carries no chain data at all — the
cards are the contract's design facts (6 states, 4 refusals, 0 oracles), not live figures.

**0:20–0:40 — Into the venue.** Click **Open the venue**. Point at the KPI row — units counted,
obligations live, escrowed — and say these are read from the contract when the page loads, with no
wallet involved. The line under the connect button says so: *reading needs no wallet.*

**0:40–1:10 — The money shot: a unit is a receipt, and an index is spent once.** Open obligation
**#2** (closed, 7 of 10 counted). The **Receipts** row lists every unit index with the hash stored
against it: `#0 · 0x5e315fb7…` through `#6`, then `#7 free`, `#8 free`, `#9 free`. Say the thing
that matters: *the count is not a claim, it is a mapping on chain that cannot be written twice* —
which is why the same index can never be counted again. Then show **#4**, an open job, reading
`#0 free #1 free #2 free`, and note that the free index is the one to count next rather than a
transaction the contract would refuse.

**1:10–1:40 — Five jobs, every state, no one in charge.** Walk the board top to bottom: `#5 Settled`
(the one to linger on — **one address is its buyer, its executor and its taker**), `#4 Open` (escrow
locked, nothing owed yet), `#3 Closed` (a taker posted a bond and counted nothing), `#2 Closed`
(7 counted, 3 refunded), `#1 Settled` (10 of 10, each side paid for what it counted).
Then click an executor address in any row — it opens the explorer, so every row on the board is one
click from the chain it describes.

**1:40–2:00 — The failure, settled by rule.** Open **Settlement** and read the `#3` outcome aloud:
the executor was paid for the one unit it counted, the buyer got the five uncounted units back plus
the forfeited bond, and the taker — who counted nothing — was owed nothing. No jury, no dispute, no
administrator, and no line of it decided by a person.

**2:00–2:20 — Why this cannot be a spreadsheet.** Return to the landing and read the zero card in
its own words: *"Zero oracles, votes, juries or admin keys decide settlement. Counted units and
arithmetic do."* Then say the honest part: the contract cannot judge whether work is good, it can
only count receipts and refuse duplicates, and that limit is written down rather than hidden behind
a service. If `docs/LIVE-GATES.md` is open in another tab, the seven refusals the deployed bytecode
returned are there with their hashes — including `UnitAlreadyCounted()`, the one the receipts row
makes visible.

## Backup ladder (real artifacts only)

1. The read walkthrough above.
2. The same page reloaded — the board already holds the jobs from the live gate run, so `taken`,
   `settled` and `closed by rule` can be shown and discussed without driving anything.
3. Explorer tabs for the recorded transactions in `docs/LIVE-GATES.md`, walked through in order.
4. The recorded capture of any of the above, with the tx hashes listed under the video.

Never: mock data, canned numbers, a "simulated" mode, or a fallback that invents a result.

## Questions to have answers ready for

1. *How does the contract know the unit was really done?* It does not judge quality — it counts
   receipts and refuses duplicates. Quality is the buyer's acceptance rule, stated as a limit
   rather than hidden behind a service.
2. *Why would anyone take over someone else's work?* They buy the remainder when they are cheaper
   at finishing it than the remaining escrow is worth to them, and the bond is their own money at
   risk if they do not.
3. *What if a taker takes it and stalls?* The deadline rule takes the bond and the buyer keeps the
   refunded remainder. There is nothing to file and no one to persuade.
4. *Why not deploy on an existing venue on mainnet?* Because the instrument is the product, not the
   venue: no stake gate, no admin-gated deployment, and a testnet deployment lets the mechanism be
   checked publicly before capital is at risk.
5. *What is not finished?* Verification on the explorer is not claimed, nobody outside this build
   has taken over an obligation yet, and the site carries a wallet-vendor reputation flag that the
   README's honesty table states. All three are in the README rather than implied away.
