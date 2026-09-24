# RUN OF SHOW — Obligo demo (target 150s)

Every hash on screen must resolve on the testnet explorer before recording. There is no mock
fallback: if the network is flaky, we show the recorded real capture and the README links.

## Pre-flight (T-10 min)

- [ ] Testnet RPC responsive: `cast block-number --rpc-url $XLAYER_TESTNET_RPC`
- [ ] Deployed address matches README table
- [ ] Three funded testnet wallets imported (buyer, executor, taker) — faucet OKB
- [ ] Contracts verified on the explorer (or the honest note recorded)
- [ ] `forge test` green on the exact commit being demoed
- [ ] `pnpm verify` prints N/N claims re-read from chain
- [ ] Explorer tabs pre-opened for the four hero txs

## Beats

1. **0:00–0:15 — The problem, one picture.** A job of 10 units, buyer escrows. Executor
   finishes 4 units and stops. Today that becomes a refund and the work is discarded.
2. **0:15–0:40 — The stall is declared.** On chain. Show the tx. The job state flips.
3. **0:40–1:05 — The obligation is listed, and a bond is posted.** A different wallet takes the
   remaining 6 units and posts 50% of the remainder. Show the bond tx and the contract balance
   change.
4. **1:05–1:25 — The taker finishes the work.** Six `countUnit` calls, each with its receipt
   hash. The split settles by arithmetic: the first party paid for 4, the taker for 6 plus the
   bond back, and the buyer receives a finished job from a different machine.
5. **1:25–1:50 — The interesting half: the taker also fails.** Second job, taker stops, the
   deadline passes, `closeFailed`: the executor keeps pay for its units, the taker is paid only
   for what it counted, and the bond moves to the buyer. No jury, no dispute, no refund of the
   whole job.
6. **1:50–2:30 — Why this cannot be a spreadsheet.** The conservation invariant re-checked
   live; the refusal shown on chain (a duplicate unit rejected with its revert reason); the
   claims page re-reading state from the chain.

## Backup ladder (real artifacts only)

1. Live demo on testnet.
2. Same demo on a local node (real transactions, real contract verdicts) with the testnet
   explorer links shown for the identical flow.
3. Recorded capture of either of the above, with the tx hashes listed under the video.

Never: mock data, canned numbers, a "simulated" mode, or a fallback that invents results.

## Judge questions to have answers ready for

1. *How does the contract know the 4 units were really done?* It does not judge quality — it
   counts receipts and refuses duplicates. Quality is the buyer's acceptance rule, stated in
   WHAT_IS_REAL.md as an explicit limit.
2. *Why does a taker take a worse deal than doing their own job?* They buy the remainder below
   its face value only if they are cheaper at it; the bond is their own money at risk.
3. *What if the taker griefs by taking and stalling?* They lose the bond to the buyer by the
   deadline rule, and the buyer keeps the refunded remainder.
4. *Why not deploy this on an existing venue protocol on mainnet instead?* Answer with the
   three-part argument: no stake gate, the instrument is the product rather than the venue, and
   a testnet deployment lets the mechanism be published before capital is at risk.
5. *What is not finished?* Read WHAT_IS_REAL.md aloud. That is the point of the file.
