# RUN OF SHOW — Spectral (clicks + narration, ~2:20, website only)

You click through the site; this is what to say over it. No terminal, no editor, no repository view
on camera. Nothing here needs a wallet, so no wallet popup appears and no vendor warning interrupts
the take.

## Pre-flight (T-5)

- [ ] Window ≥ 1400px wide, zoom 100%
- [ ] Tab one: `https://spectral-venue.vercel.app/` — leave it a few seconds, then open tab two
- [ ] Tab two: `https://spectral-venue.vercel.app/app`
- [ ] Explorer tab closed; you open it by clicking, on camera
- [ ] Know the five rows before you start: `#5 Settled 3/3`, `#4 Open 0/3`, `#3 Closed 1/6`, `#2 Closed 7/10`, `#1 Settled 10/10`

## The beats

Everything in **bold** is said out loud. Everything after **Click:** is what you do.

### 0:00–0:18 — Landing, one slow scroll

**Click:** nothing. Scroll the landing once, slowly, and stop on the green callout.

> "Unfinished work has two endings today. You get everything back, or you argue about it. The part that actually got done has no representation, so it gets thrown away. Spectral turns the unfinished part into an obligation somebody else can take over."

Read the card on the callout aloud, don't paraphrase it:

> "Four refusals the contract makes on its own: wrong escrow, a unit counted twice, a bond below half the remainder, a stall declared twice."

### 0:18–0:30 — Open the venue

**Click:** "Open the venue", top right. Land on the board and point at the KPI row.

> "This is the venue. Every number here was read from the contract when the page loaded. There's no database behind it and nothing cached. Notice the line under the button — reading needs no wallet."

**Do not click Connect wallet.**

### 0:30–0:55 — The receipt

**Click:** row **#2** (Closed, 7 / 10). Point at the **Receipts** row in the panel on the right.

> "This job had ten units. Seven got counted, three are left. Every counted unit stores a receipt hash on chain against its unit index, and you can see them one by one. That's why the count isn't a claim: an index can never be written twice, so the same unit can't be counted again. Those three are still free."

### 0:55–1:10 — An untouched job

**Click:** row **#4** (Open, 0 / 3).

> "This one hasn't been started. Three units, escrow locked, nothing owed to anyone yet. All three indices are free, so the free one is simply the next one to count, not a guess."

### 1:10–1:30 — Every state, and one wallet doing all of it

**Click:** row **#5**, and linger. Then **#3**, then **#1**, letting the panel change with each.

> "Five obligations, every state the machine has. Look closely at this one: buyer, executor and taker are the same address. It was opened, counted, stopped, taken over and finished by one wallet. The contract restricts addresses, not how many wallets you hold."

### 1:30–1:45 — One click to the chain

**Click:** any executor address in the table (the `↗` link). The explorer opens in a new tab — hold it for a beat, then come back.

> "Clicking any address opens the chain it came from. Every row on this board is one click from being checked."

### 1:45–2:05 — The ending that matters

**Click:** "Settlement" in the sidebar. Read the row for **#3**.

> "Job three is the ending worth looking at. The executor was paid for the one unit it counted. The buyer got the five uncounted units back, and kept the bond the taker posted. The taker counted nothing, so it was owed nothing. No jury, no dispute, no administrator. Not one line of it decided by a person."

### 2:05–2:20 — Close

**Click:** "The rule" in the top nav, or scroll back to the landing.

> "Zero oracles, votes, juries or admin keys decide settlement. Counted units and arithmetic do. The whole venue is a hundred and ninety-four lines with no privileged role in it."

Stop.

## Optional extra clicks (only if a beat feels thin)

- Type `closed` into the sidebar **"Filter obligations"** box so the board narrows to 2 of 5, then clear it. One line: *"The board is just a read of the contract, so filtering costs nothing."*
- Click **"Open a job"**, point at the escrow line computing `units × price` exactly, then click **"Use my address as the executor"**. One line: *"Escrow is exact by construction, and you can name yourself as the executor to run the whole lifecycle."* Do not submit the transaction on camera unless you've decided the wallet warning is acceptable.

## Things not to say

- No claim of source verification on the explorer. It isn't done, and the README says so.
- Don't imply the video is creating these jobs. They're already on chain; the video reads them.
- Don't claim a stranger has taken over an obligation yet. Nobody outside this build has.
- No "simulated", "mock" or "demo mode" anything. There is no such mode to fall back on.

## If something breaks

1. Reload. The board already holds all five jobs, so every beat above still works.
2. The receipts row reads a handful of contract calls and prints "reading unitReceipt(…)" until they land. Give it two seconds rather than clicking away.
3. Anything else: skip that beat and keep the take. A missing click is cheaper than an invented number.
