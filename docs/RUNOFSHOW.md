# RUN OF SHOW — Spectral (target 150s, website only)

Everything on screen is the product in a browser: no terminal, no editor, no repository view. The
transactions are shown where the audience can check them — as their result inside the page, and on
the explorer tab when a hash matters. Nothing is mocked; if the network is flaky, use the ladder at
the bottom rather than inventing a screen.

## Pre-flight (T-10 min)

- [ ] The app is up — use the hosted URL `https://spectral-venue.vercel.app` (`/api/config` answers there), or `npm run dev` in `app/`
- [ ] Three browser profiles, each with its own wallet, holding the funded testnet actors'
      keys — buyer `0xA6cFa92Ee3CF71cb74773BEBeDd79ae01755de62`,
      executor `0x866dea054E74547a1B65F83A8BF26a148b1e1C55`,
      taker `0x017C2e8785aDDE2Cac9a5527bf7C5bb729AaD16C`
- [ ] Each wallet is on X Layer testnet (the app offers to add and switch the chain for you)
- [ ] Each actor has testnet OKB: `https://web3.okx.com/xlayer/faucet`
- [ ] Explorer tabs pre-opened for the jobs the board already shows, so nothing is typed live
- [ ] `forge test` green on the exact commit being demoed, and `python3 verify.py` prints 10/10
- [ ] Browser zoom at 100%, window ≥ 1400px wide, wallet popups resized out of the way
- [ ] Source verification is NOT claimed anywhere — do not imply it on camera

## Beats

**0:00–0:20 — The landing, first impressions.** Open `/`. Let it scroll: the headline, the three
rules, the metric cards (6 states, 4 refusals, 0 reporters), the two case cards. Narrate the one
sentence: *work that was never finished becomes a counted obligation.* Note out loud that this page
carries no chain data at all — the numbers are the contract's design facts, not live figures.

**0:20–0:35 — Into the venue.** Click **Open the venue**. The dashboard loads and reads the
contract on render. Point at the KPI row — units counted, obligations live, OKB escrowed — and say
these are read from the chain at page load, not typed in.

**0:35–1:00 — Open a job.** Click **Open a job**. Fill in the executor address, the unit count and
the price per unit, and show the **Escrow required** line computing units × price. Click the coral
pill. The wallet popup appears; confirm it. The toast goes *pending → confirmed*, and it carries a
**View on explorer** link — click that once, so the hash is on screen and checkable.

**1:00–1:20 — A unit is counted, and counted once.** As the executor, open the job and use **Count
a finished unit** with an index. Then try the *same index again* and let the refusal happen on
camera — the toast stays red and quotes the contract's own reason. This is the money shot for
"refusals are the product": nothing is argued about afterwards.

**1:20–1:45 — The executor stops, and the remainder is listed.** Click **I am stopping**, then
**List for takeover**. The state chip moves `Open → Stalled → Listed`. Say the sentence that
matters: *the work already done is paid for, and what's left is still worth finishing.*

**1:45–2:10 — A different wallet takes it over.** Switch to the taker's profile, reload `/app`, pick
the listed job and click **Take over … bond …**. The bond is at least half the remaining escrow.
Show the toast confirmation and point at the new **Taker** and **Taker bond** rows.

**2:10–2:30 — The second failure, closing by rule.** Let the taker's deadline pass — the board shows
it, and the chip becomes `closed by rule` once it is called. Then open **Settlement** and read the
outcome row aloud: the executor was paid for the units it counted, the taker for the units it
counted (none), and the bond went to the buyer. No jury, no dispute, no administrator.

**2:30–2:50 — Why this cannot be a spreadsheet.** Return to **Overview**, click the executor address
in any row — it opens the explorer, so every row on the board is one click from the chain. Then read
the closing line from the landing's limits section: *no quality judgement, no oracle, no admin key,
no leverage, no jury.* The refusals are the product, and they are stated rather than hidden.

## Backup ladder (real artifacts only)

1. Live run, as above.
2. The same page reloaded — the board already holds the jobs from the live gate run, so the states
   (`taken`, `closed by rule`) can be shown and discussed without driving a new lifecycle.
3. Explorer tabs for the seven mined transactions in `docs/LIVE-GATES.md`, walked through in order.
4. The recorded capture of any of the above, with the tx hashes listed under the video.

Never: mock data, canned numbers, a "simulated" mode, or a fallback that invents a result.

## Questions to have answers ready for

The five hardest are written out in [`JUDGE-QA.md`](JUDGE-QA.md). The short versions:

1. *How does the contract know the unit was really done?* It does not judge quality — it counts
   receipts and refuses duplicates. Quality is the buyer's acceptance rule, stated as a limit.
2. *Why would anyone take over someone else's work?* They buy the remainder below its face value
   only when they are cheaper at finishing it; the bond is their own money at risk.
3. *What if a taker takes it and stalls?* The deadline rule takes the bond, and the buyer keeps the
   refunded remainder. There is nothing to file and no one to persuade.
4. *Why not deploy on an existing venue on mainnet?* Because the instrument is the product, not the
   venue: no stake gate, no admin-gated deployment, and a testnet deployment lets the mechanism be
   checked publicly before capital is at risk.
5. *What is not finished?* Read `WHAT_IS_REAL.md` aloud — verification on the explorer is not
   claimed, and hosting and the video are the remaining artifacts. That is the point of the file.
