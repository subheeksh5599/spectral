# Narration — Spectral demo

Published: **https://youtu.be/EK-t91r63Fw** — 2:15, 1364x752, male voice.
Committed copy: `demo/media/spectral-demo.mp4` (same file, so the demo outlives the video host).
Working file: `/home/arch/Videos/spectral_demo_narrated.mp4`.
Source recording: `/home/arch/Videos/recording_2026-09-25_10.47.56.mp4` (5:02, silent).

Sparse by design: eight lines, 74s of speech across 135s. The other 61s is silence, so the
screen does the talking except where a claim needs saying out loud.

## Voice

edge TTS, `en-US-AndrewMultilingualNeural`. Measured median F0 of the render is 108.8 Hz, which is
in the male range, so the delivered audio is a male voice and not the machine default.
The machine's configured default is `en-US-AriaNeural` (female) and that config is agent-protected,
so the narration was generated with the bundled `edge-tts` binary instead of by editing the config.
Nothing in `~/.hermes/config.yaml` was changed.

Alternates rendered, same first line, in case a different read is wanted:
`/home/arch/Videos/sample_brian.mp3`, `/home/arch/Videos/sample_christopher.mp3`.

## Lines, and where each lands

| line | at | length | over |
|------|----|--------|------|
| L1 | 2.0s | 10.3s | landing, the problem |
| L2 | 13.5s | 10.6s | landing, counted units are paid |
| L3 | 28.0s | 9.4s | dashboard, five live jobs read off chain |
| L4 | 52.0s | 12.1s | opening a job, escrow exactly 0.01 |
| L5 | 76.0s | 9.5s | job six open, same wallet as executor |
| L6a | 91.5s | 3.8s | the escrow on chain, accepted on L2 |
| L6b | 100.0s | 10.0s | the executor stops, the bond rule |
| L7 | 126.0s | 8.5s | six jobs, four states |

The two signing moments (the MetaMask transaction requests) are deliberately left un-narrated.

## Text as spoken

**L1** — Work that stops halfway ends one of two ways. Everything gets refunded, or two parties argue about who owes what. The part that actually got done just disappears.

**L2** — Spectral counts the job in units and escrows the money against them. Whoever counted a unit gets paid for it, and that holds even when the job falls apart.

**L3** — This is the deployed contract, with five live jobs on it. Every number on this page came off the chain when it loaded, and none of it needs a wallet to read.

**L4** — I'm opening a new job. Ten units at zero point zero zero one OKB each, so escrow is exactly zero point zero one, and the contract refuses anything that isn't.

**L5** — Confirmed. Job six is open with ten units, and I put my own address as the executor, so this one wallet can run the whole lifecycle.

**L6a** — There it is on chain. The escrow, accepted on L2.

**L6b** — Now the executor stops. The units nobody counted become an obligation anyone can take over, by posting a bond of at least half of what's left.

**L7** — Six jobs on chain. Settled, closed, open, stalled. No oracle, no jury, no admin key anywhere in it.

## What was cut from the 5:02 recording, and why

| original | cut | reason |
|----------|-----|--------|
| 0:49–1:36 | 47s | unlocking the wallet: password screen, no product on screen |
| 2:16–2:30 | 14s | black and transitional frames |
| 2:30–3:16 | 46s | the explorer page stuck in a skeleton loading state, nothing rendered |
| 3:16–4:12 | 56s | wallet "loading is taking longer than usual", then repeated popups |
| 4:12–5:02 | 50s | second and third signing cycles, an explorer SSL error, and drifting between views |

Kept: the landing story, the live board, one signing of the escrow, the confirmation, the on-chain
escrow page, declaring the stall, the two confirmed receipts on job six, and the final board.
Every frame kept shows rendered content; no blank, skeleton or error screen survives in the cut.

## Claims, each verified against the deployed contract

- five live jobs at that point → five jobs existed before job six; `jobCount()` read 5, then 6
- escrow exactly 0.01 → job 6 is 10 units at 0.001 OKB, and `createJob` refuses any other value
- same wallet as executor → job 6 buyer and executor are both `0x087ef173…`; read from `jobs(6)`
- the stall landed → job 6 state reads `Stalled` (1) with nothing counted; the recording shows
  "Declare stall on job #6 — confirmed"
- bond of at least half the remainder → `requiredBond` is remaining × price / 2 in the contract
- six jobs in four states → `jobs(1..6)` are Settled, Closed, Closed, Open, Settled, Stalled
- no oracle, jury or admin key → no privileged role exists anywhere in `src/Spectral.sol`

Every line above was true of the chain when this was recorded. Two states have moved since, which
is the difference between a recording and a claim: job 6 has been **listed** (state 2, a 0.005 OKB
bond for its ten uncounted units), and the second market now exists alongside this one — six jobs
of its own, four takeovers, three of them signed from the venue page. The README carries the same
note where it describes the walkthrough, and the chain is the authority for all of it.

## Humanizer pass

Applied before recording the audio, per the skill. Changes from the draft:

- em dashes removed throughout (the draft's biggest tell)
- negative parallelism cut: "it's not just escrow, it's a market" removed from L2
- rule-of-three padding cut from L6 ("finish it, prove it, get paid")
- tailing negation cut: "no guessing at the index" dropped from L4
- signposting cut: "let me show you", "here you can see" openers removed
- dramatic fragment cut: L4 no longer ends "One hundredth, not a wei more."
- reassurance kicker cut: L7 no longer ends "and that is the whole idea"
- copula avoidance fixed: "serves as the escrow layer" became "escrows the money against them"
- promotional adjectives cut: seamless, elegant, powerful
