<div align="center">

# SPECTRAL

### Unfinished machine work, turned into a counted obligation. Stop mid-job and the remainder is listed, bonded, and settled by arithmetic.

[![Tests](https://img.shields.io/badge/tests-288%20passing-10b981)](#tests)
[![Chain](https://img.shields.io/badge/live-X%20Layer%20testnet%201952%20%C2%B7%206%20jobs-4DA2FF)](#live-status)
[![Refusals](https://img.shields.io/badge/refusals%20by%20the%20deployed%20bytecode-7-2563eb)](#attack--test)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Stack](https://img.shields.io/badge/Solidity%200.8.24%20%2B%20Foundry%20%2B%20Next.js%2016-1f1f23)

[![▶ Watch the demo](https://img.shields.io/badge/%E2%96%B6%20Watch%20the%20demo-2%3A15-FF0000?labelColor=1f1f23)](https://youtu.be/EK-t91r63Fw) [![Local copy](https://img.shields.io/badge/Local%20copy-demo%2Fmedia%2Fspectral--demo.mp4-14151a?labelColor=0f1420)](demo/media/spectral-demo.mp4) [![Live venue](https://img.shields.io/badge/Live%20venue-spectral--venue.vercel.app-14151a?labelColor=0f1420)](https://spectral-venue.vercel.app) [![Honesty table](https://img.shields.io/badge/Honesty%20table-what%20is%20real%20vs%20pending-14151a?labelColor=0f1420)](#whats-real-vs-pending--the-honesty-table) [![Run it](https://img.shields.io/badge/Run%20it-one%20command-14151a?labelColor=0f1420)](#-see-it-in-one-command)

</div>

Most work systems answer the easy question: _is the job done?_ SPECTRAL answers the harder one: **who is owed what when it stops halfway?** Today an agent that stalls mid-job leaves two options: a full refund, or an argument. The work already finished has no representation at all, so it is thrown away. SPECTRAL makes the remainder a first-class object: it is counted, listed, priced by whoever takes it, bonded, and settled by the count of finished units. Nobody votes, nobody arbitrates, and no key exists that can move the money.

```
UNFINISHED  ≠  FAILED  ≠  REFUNDED
```

There is no `PARTIALLY_DONE_WITH_WARNINGS`. Either the executor counted the units and is paid for them, or the remaining units are still locked in a live job. Every wei is in exactly one of those two places, in every terminal path, and that is asserted by a fuzzed invariant rather than promised in prose.

## Live status

**Built for OKX Dev Day 2026 — Build a Market, remote build.** The chain is OKX's **X Layer testnet 1952** (chain id `0x7a0`, OKB for gas); every receipt opens in **OKX's own explorer**, and the venue reads that chain in a browser with no wallet installed. Exactly how much of the build sits on OKX's own surface is listed under [On OKX and X Layer](#on-okx-and-x-layer) — stated, not implied.

**Deployed and exercised on a public testnet**, with no owner, no admin, no oracle, no jury, and no upgrade path. `verify.py` ignores our records entirely and re-derives the claims from the chain: it prints **10/10** for the two flagship jobs and **22/22** across all five counted-state jobs. The venue is live at **https://spectral-venue.vercel.app** and reads that same contract from the browser with no wallet installed.

| Surface | Status | The evidence |
|---|---|---|
| Contract, testnet 1952 | **LIVE** | `0x2899eb0972f86cc90d054d19a5816233d9af56d9` — 40 public transactions, lifecycle run end to end, `verify.py` 22/22 |
| Job #1 | **SETTLED** | the executor counted 4 of 10 and stopped; a taker took the remainder, counted the other 6, and the job settled 10/10 — each side paid for exactly what it counted |
| Job #2 | **CLOSED** | 7 of 10 counted (4 executor, 3 taker); the 3 remaining units and the forfeited bond went back to the buyer by rule |
| Job #3 | **CLOSED** | a taker posted a bond, counted nothing, and was owed nothing — the bond moved to the buyer |
| Job #4 | **OPEN** | a live job, escrow still locked, nothing owed to anyone yet |
| Job #5 | **SETTLED** | one address as buyer, executor and taker walked the whole path: 3 of 3 counted, 0.002 OKB credited to that address, and `requiredBond(5)` read back from the contract |
| Job #6 | **STALLED** | ten units escrowed at 0.001 OKB, bought and stalled by one address during the recorded walkthrough; nothing counted, so it sits on the board as a live obligation anyone with a bond can take |
| Seven invalid actions | **REFUSED by the deployed bytecode** | `UnitAlreadyCounted`, `EmptyReceipt`, `UnitOutOfRange`, `NotExecutor`, `NothingToTake`, `AlreadyStalled`, and an arithmetic panic — each with the contract's own reason, in [docs/LIVE-GATES.md](docs/LIVE-GATES.md) |
| Venue application | **LIVE** | landing at `/`, venue at `/app`; reads six jobs and 21 of 42 counted units off the contract in a browser, anonymous, 0px overflow |
| Board API, keyless | **LIVE** | `GET /api/board` returns the same six jobs, 21/42 units and 0.01 OKB still locked, read from the contract at request time; `?job=` and `?state=` filter it, `?market=token` reads the second market |
| Token-denominated market, testnet 1952 | **LIVE** | `0x232a35C819BEcf3D10eA24Aa3E7F9aC616B287B5`, escrow and bonds in `tTSLA`; two jobs run end to end in 31 transactions, `verify_token.py` **15/15**, receipts and hashes in [docs/TOKEN-MARKET.md](docs/TOKEN-MARKET.md) |
| The equity-shaped token it escrows | **LIVE, and a replica** | `0x7E7789c15E2792798176533d8843935947732b3C` — a real ERC-20 deployed on this testnet, open faucet, no issuer and no share behind it; the app calls it a replica everywhere it appears |
| Source verification on the explorer | **NOT ATTEMPTED** | the explorer's verification route is gated behind a paid plan; not claimed anywhere |
| Someone outside this build taking over an obligation | **NOT YET** | stated plainly in the [honesty table](#whats-real-vs-pending--the-honesty-table) rather than implied |

## On OKX and X Layer

The build sits on OKX's chain. This section says exactly how much of it is on OKX's own surface — no more than is true.

| Piece | What it is | Where |
|---|---|---|
| Chain | **X Layer testnet 1952** (chain id `0x7a0`), gas token **OKB** | `app/app/api/config/route.js` serves every chain value at runtime from the environment; no chain id, RPC, explorer or address is compiled into the client |
| RPC | X Layer's public testnet RPC (`testrpc.xlayer.tech/terigon`) — the same endpoint `verify.py` re-derives the claims from | `verify.py`, `foundry.toml` |
| Explorer | every receipt opens on **OKX's explorer** (`okx.com/web3/explorer/xlayer-test`), and the venue renders a per-row explorer link for each job | `docs/RECEIPTS.md`, `docs/LIVE-GATES.md`, `app/components/Dashboard.jsx` |
| Faucet | where a judge needs gas to sign, the app links **OKX's X Layer faucet** | `app/components/Dashboard.jsx` |
| Wallet | signing is EIP-1193, and **OKX Wallet is selected first when the extension is installed** (`window.okxwallet`), then any other injected wallet | `app/lib/wallet.js` |
| Chain add / switch | the wallet is offered X Layer's chain id, name, native currency, RPC and explorer via `wallet_addEthereumChain`, so first-time signers are not left configuring a network by hand | `app/lib/venue.js` |

What is **not** wired, said plainly rather than implied: no OKX.AI agent or ASP listing, no x402 payment path, no OKX DEX or market-data call on the critical path, and no mainnet deployment. `.env.example` reserves `OKX_API_KEY` for server-side market data; nothing the product runs depends on it. Testnet is a deliberate choice for a mechanism this young, and the contract is chain-agnostic — no precompiles, no oracles, no token interfaces — so mainnet is a redeploy rather than a rewrite. [How I'd deploy it](#how-id-deploy-it) says what would change.

## This is a market, in market words

Built for the **Build a Market** track, so here is the same mechanism said in market vocabulary rather than protocol vocabulary. Every row maps to something the contract does and to the test that covers it.

| What a market needs | What this one does | Enforced by |
|---|---|---|
| Supply anyone can see | a stalled job's remainder becomes a listing: `listObligation(jobId, takerDeadline)` is permissionless, and the board renders every listing to a visitor with no wallet | `test_matrix_*`, the venue's anonymous read |
| A price | fixed when the job is funded — `createJob` requires exactly `units × pricePerUnit`, and the remainder inherits that same per-unit price, so the buyer's exposure cannot move afterwards | `testCreateRequiresExactEscrow`, `test_escrow_one_wei_short_refused` |
| A buyer for the remainder | anyone may take a listing by posting a bond at or above the contract's own `requiredBond(jobId)` — no allowlist, no approval step | `test_bond_formula_*`, `BondTooSmall(required)` |
| Collateral that makes failing expensive | the bond is at least half the remaining escrow and forfeits to the buyer if the taker's deadline passes with units uncounted; a taker who finishes gets it back in full | `testTakerFailureForfeitsBondToBuyer`, `closeFailed` |
| Settlement, not arbitration | each party is paid `units counted × pricePerUnit`; there is no `resolve()`, no jury, and no key that can call one | `testFuzzConservation` (256 runs) |
| A read surface other software can consume | the listing board is a public keyless JSON API, and a CLI that speaks the same module — see [below](#read-the-market-from-anywhere--the-board-api) | `GET /api/board`, `scripts/board-cli.mjs` |

Two things this market prices differently from a conventional one, said plainly. **The bond is where risk is priced, not the price itself** — per-unit price is fixed at funding and only the bond responds to how much remainder is at stake, so a taker's expected return is the gap between the remaining escrow and what finishing actually costs it. And **there is no reputation input**: a taker is judged today by its bond, not its history, which is the deliberate trade this design makes — arithmetic instead of a trusted judge. [Limitations](#limitations) says where that bites.

What this market deliberately does not have: a fee, a token, a curator, a council, or a dispute window.

## The second market — escrowed in a token that is shaped like an equity

The market above escrows **native value**, and native value cannot be a share. The things a market on OKX's rail actually trades are tokenized equities and stablecoins, so on a testnet the honest move is not to simulate a token but to **deploy one and use it**.

So the same contract is deployed a second time with an ERC-20 as its asset: **`SpectralToken`**, at `0x232a35C819BEcf3D10eA24Aa3E7F9aC616B287B5`, escrowing **`tTSLA`** at `0x7E7789c15E2792798176533d8843935947732b3C`.

Being precise about the token, because this is the one place a project could flatter itself: it **is** a real ERC-20 on X Layer testnet — deployed by this project, with real transfers, balances and allowances, and an open `mint()` faucet so anyone can obtain it. It is **not** an xStock, not Backed-issued, not a Tesla share, not a claim on anything. It has no issuer, no transfer agent, no redemption and no price. The name it returns is `Testnet Equity Replica: TSLA`, and the app calls it a replica wherever it appears. What it gives the market is what the market needs: a token that behaves like the asset it stands in for.

The state machine is identical — the same counting, the same single-count-per-index rule, the same stall, listing, bonded takeover and forfeit, the same arithmetic settlement in place of arbitration, and still no owner, admin, oracle, jury, pause or upgrade path. Two things differ, both visible in the source:

| | native-value market | token-denominated market |
|---|---|---|
| escrow and bond move by | `msg.value` | `transferFrom`, so an allowance must cover it |
| taking an obligation | payable bond | `takeObligation(jobId, bondAmount)` |
| the asset | the chain's native coin | fixed at deployment, `immutable` — it can never be repointed |

**Two jobs have already been run on the live testnet in this token**, with three distinct wallets and 31 real transactions, green end to end:

- **Job 1** — 10 tTSLA escrowed. The executor counted 5 units and stalled. A different wallet took the remainder for the 2.5 tTSLA bond the contract asked for, finished the five remaining units, and it settled by arithmetic: 5 tTSLA to the executor, 5 tTSLA plus the returned bond to the taker.
- **Job 2** — the taker bought a nine-unit remainder for a 4.5 tTSLA bond and finished nothing. After the deadline the close moved the money by rule: 1 tTSLA to the executor for the unit it counted, 9 tTSLA of unearned escrow back to the buyer, and the 4.5 tTSLA bond forfeited to that same buyer. The market held 14.5 tTSLA before and 0 after.

```bash
$ RPC_URL=https://testrpc.xlayer.tech/terigon \
  VENUE=0x232a35C819BEcf3D10eA24Aa3E7F9aC616B287B5 JOBS=1,2 python3 verify_token.py

15/15 verified
```

`verify_token.py` reads the market and the token it names, keyless: escrow arithmetic per job, counted units never above registered units, the bond never below half the remainder, states inside the six the contract defines, **the market's token balance equal to its credits plus what is still in flight**, no native value held at all (this contract has no payable path), and the token supply a plain faucet mint. Every hash — deploys, both takeovers, the failed close, every claim — is in [docs/TOKEN-MARKET.md](docs/TOKEN-MARKET.md), and the venue page shows this market as a read-only panel fed by `GET /api/board?market=token`.

What this buys, said without inflation: it shows the mechanism is **not tied to native value**. The invariants, the test suite, the fuzz and the verifier are the same because the machine is the same; only the asset moved. What it does not buy is a claim to be trading an equity — the equity is a replica, and the second market is driven by a script (`script/TokenMarket.s.sol`) rather than by a button in the app, which is why the panel is labelled read-only.

## ▶ Demo

[![▶ Watch the demo: 2:15, real screen capture of the venue answering on testnet](demo/media/spectral-demo-poster.png)](https://youtu.be/EK-t91r63Fw)

**[▶ Watch the demo (2:15)](https://youtu.be/EK-t91r63Fw)** &nbsp;·&nbsp; **[ Local copy ↗ ](demo/media/spectral-demo.mp4)** &nbsp;·&nbsp; **[ What's real vs pending ↗ ](#whats-real-vs-pending--the-honesty-table)** &nbsp;·&nbsp; **[ Run it yourself ↗ ](#-see-it-in-one-command)**

_One take of the deployed venue, driven from the page with a real wallet against X Layer testnet._ The narration is deliberately sparse: it stays quiet through both wallet signatures, so what you hear about is the on-chain result rather than the clicking.

The walkthrough opens the board with all six obligations and their states, opens a new job for ten units, signs the escrow, and then reads that escrow back off the explorer: accepted, 0.01 OKB, block 41,854,761. It stalls the job at the end, which is why the board it closes on shows job #6 sitting live with nothing counted. That is the state the whole mechanism exists for: work that stopped, still on the books, with a price on the remainder instead of a refund.

Both of job #6's transactions are openable: `createJob` and `declareStalled`, in [docs/RECEIPTS.md](docs/RECEIPTS.md).

## The 20-second pitch

An agent is hired for ten units of work and stops after seven. Under a refund rule the buyer gets everything back and the seven finished units are thrown away. Under a dispute the money sits with a third party while a human reads a ticket. Both outcomes punish the party that did the work.

SPECTRAL prices the remainder instead. The executor declares the stall, or anyone can once the work deadline passes, and the three unfinished units become a listed obligation. A taker puts up a bond of at least half the remaining escrow to claim them. If the taker finishes, the executor is paid for seven and the taker for three plus its bond back. If the taker never finishes, the executor is still paid for seven, the buyer is refunded the remainder, **and the buyer keeps the bond**. That last sentence is the whole design: failing to finish costs the taker money, the party that worked is paid either way, and no administrator decides any of it.

```mermaid
stateDiagram-v2
    [*] --> Open : buyer escrows units × price
    Open --> Open : executor counts a unit
    Open --> Stalled : executor quits · or anyone after the deadline
    Stalled --> Listed : anyone lists the remainder
    Listed --> Taken : a taker posts bond ≥ 50% of the remainder
    Taken --> Taken : taker counts a unit
    Open --> Settled : all units counted
    Taken --> Settled : all units counted
    Taken --> Closed : taker deadline passes, units outstanding
    Closed --> [*] : executor paid · buyer refunded + bond
    Settled --> [*] : each party paid for what it counted
```

## Table of contents

- [Live status](#live-status)
- [On OKX and X Layer](#on-okx-and-x-layer)
- [▶ Demo](#-demo)
- [The 20-second pitch](#the-20-second-pitch)
- [This is a market, in market words](#this-is-a-market-in-market-words)
- [The second market — escrowed in a token that is shaped like an equity](#the-second-market--escrowed-in-a-token-that-is-shaped-like-an-equity)
- [Table of contents](#table-of-contents)
- [▶ See it in one command](#-see-it-in-one-command)
- [Screenshots](#screenshots)
- [Verify every claim in one command](#verify-every-claim-in-one-command)
- [What SPECTRAL is NOT](#what-spectral-is-not)
- [The problem I set out to solve](#the-problem-i-set-out-to-solve)
- [What I built](#what-i-built)
- [Architecture](#architecture)
- [The continuation loop, step by step](#the-continuation-loop-step-by-step)
- [Where the guarantee is enforced](#where-the-guarantee-is-enforced)
- [Who approves what](#who-approves-what)
- [Engineering decisions & the traps that taught me something](#engineering-decisions--the-traps-that-taught-me-something)
- [What's real vs pending — the honesty table](#whats-real-vs-pending--the-honesty-table)
- [Attack → test](#attack--test)
- [The app](#the-app)
- [Read the market from anywhere — the board API](#read-the-market-from-anywhere--the-board-api)
- [Limitations](#limitations)
- [Security](#security)
- [Tech stack](#tech-stack)
- [Project layout](#project-layout)
- [Full command reference](#full-command-reference)
- [How I'd deploy it](#how-id-deploy-it)
- [Results and supporting records](#results-and-supporting-records)
- [Tests](#tests)
- [License](#license)

## ▶ See it in one command

Requirements: `forge` 1.x (Foundry), and Node 20+ only if you want the venue app. **`lib/forge-std` is vendored in this repository**, so a fresh clone runs the whole suite with no install step — `git clone` then `forge test`.

```bash
$ forge test
Suite result: ok. 25 passed; 0 failed; 0 skipped
Suite result: ok. 235 passed; 0 failed; 0 skipped
Suite result: ok. 28 passed; 0 failed; 0 skipped

Ran 4 test suites: 288 tests passed, 0 failed, 0 skipped (288 total tests)
```

```bash
$ RPC_URL=https://testrpc.xlayer.tech/terigon \
  VENUE=0x2899eb0972f86cc90d054d19a5816233d9af56d9 JOBS=1,2 python3 verify.py
  [PASS] escrow is exact: 10 units × 1e18 == 10e18, read from the deployment
  [PASS] counted units never exceed total units, for every job
  [PASS] a settled job paid out exactly its escrow
  [PASS] venue holds exactly what it owes: credits plus money still in flight
  ...

10/10 verified
```

The whole verification is one command with no credentials, no key, and no file of ours trusted: `verify.py` talks to the chain directly and re-derives each claim, including the one that matters most: that the venue holds exactly what it owes, with money still locked in live jobs counted as in-flight rather than assumed spent.

And the product itself, which is what a person actually looks at:

```bash
$ cd app && npm install && npm run dev      # http://localhost:5173
```

Four gates, not four screenshots: the suite, the chain re-derivation, the refusals evaluated against the deployed bytecode, and the venue read live in a browser. The first two run offline against a public RPC; the third is recorded with every hash in [docs/LIVE-GATES.md](docs/LIVE-GATES.md).

## Screenshots

Real captures of the deployed venue at 2×, not mockups. Each caption is read off the image.

**The board as it loads.** Four KPI cards, then every obligation the contract holds: six jobs in four states, the counted figure on each, and the escrow still locked against the unfinished ones. Job #6 is selected, and the panel beside it is that job's whole state: buyer and executor, the escrow arithmetic (`0.01 OKB · 10 units at 0.001`), nothing counted, and the note that no action is open to this wallet until it is listed.

![The obligations as they stand](demo/media/venue-board.png)

**The rule, stated as two parties and one bond.** The executor is paid for what it counted; the taker is paid for the remainder and posts at least half of it again as a bond, which moves to the buyer if the taker's deadline passes with units still uncounted.

![Two parties. One bond.](demo/media/landing-rule.png)

**The refusals.** "The contract says no in eighteen places, and every refusal path is covered by a test." Both halves of that are checkable: the source has 18 `revert` sites and 13 named errors, and 7 of those paths were attempted against the deployed bytecode and refused with the contract's own reason.

![Refusals, not promises.](demo/media/landing-refusals.png)

## Verify every claim in one command

```bash
$ RPC_URL=https://testrpc.xlayer.tech/terigon \
  VENUE=0x2899eb0972f86cc90d054d19a5816233d9af56d9 JOBS=1,2,3,4 python3 verify.py
  [PASS] venue holds exactly what it owes: credits plus money still in flight —
         balance 4250000000000000 == credits 4250000000000000 + in flight 0
         across 3 participant(s) named by the jobs

22/22 verified
```

Read that participant count. The script used to have three wallet addresses typed into it, which made it a script that checked our wallets rather than the venue. It now reads the participants **out of the jobs themselves**, so it works against any deployment, and it separates money that is owed from money still locked in a live job. That change was forced by a false failure, and see [the traps](#engineering-decisions--the-traps-that-taught-me-something).

## What SPECTRAL is NOT

Not an escrow service with an arbitrator, not a dispute system, not a reputation score, not a token, not a marketplace with fees, and not a DAO with a treasury. There is no `resolve(jobId, winner)` and there is no council. The categories above all answer "who decides?". This one removes the question. Nothing in the contract reads a price feed, calls an oracle, holds a vote, or checks a credential:

Job 3, a real one on the deployed contract: six units at 0.0005 OKB, escrow 0.003 OKB, a taker's bond of 0.00125 OKB, and the taker counted nothing before its deadline passed.

```
buyer      credit 0.00375 OKB   5 uncounted units 0.0025 + the forfeited bond 0.00125
executor   credit 0.00050 OKB   the 1 unit it actually counted
taker      credit 0        OKB   it counted nothing, so it is owed nothing
credits    0.00425 OKB  ==  venue balance 0.00425 OKB
```

That is the entire settlement logic, and no line of it was decided by a person. The zero is not a policy anyone wrote down. It is `takerUnits × pricePerUnit`, and `takerUnits` is zero.

## The problem I set out to solve

Long-running machine work fails in the middle. An agent runs out of budget, a model starts looping, a dependency changes, a human changes their mind. What happens next is where the money goes wrong.

On a refund rule the buyer is made whole and the seven finished units evaporate: the executor did 70% of the work and is paid 0%. On a dispute rule the money is frozen while somebody reads a ticket, which means the honest party funds the delay. Both are safe for the payer and hostile to the party that worked, and neither produces anything reusable, because a job that stopped halfway leaves no artifact that another party can pick up.

The wound underneath is that **partial work has no representation**. A job is either done or not done, and everything in between is an argument. Once you accept that, the mechanism almost writes itself: represent the finished part as counted units, represent the unfinished part as a transferable obligation with a price, and let arithmetic settle it.

## What I built

A Solidity contract with no privileged role anywhere in it, plus the artifacts that make its claims checkable.

- **`src/Spectral.sol`** — 194 lines, Solidity 0.8.24. Six states, seven events, thirteen named errors, eighteen revert sites, one bond rule. No owner, no pause, no upgrade path, no oracle, no jury. `owner`, `admin`, `oracle` and `jury` appear in the source exactly once each, inside the comment that declares they do not exist.
- **288 tests, 0 failures** — 235 of them a generated conformance matrix over the whole state machine, 25 hand-written edge and adversarial cases on the native-value market, and 28 more covering the second deployment of the same machine where escrow and bonds are an ERC-20, including a 256-run conservation fuzz and a constructed reentrancy attacker.
- **`verify.py`** — re-derives the claims from the chain and prints N/N. It trusts nothing in this repository.
- **Two deployments** — anvil (chain 31337) for the development lifecycle and **X Layer testnet 1952** for the live one, 70 transaction hashes in [docs/RECEIPTS.md](docs/RECEIPTS.md).
- **A venue application** — Next.js 16, a landing page at `/` and the working venue at `/app`, both reading the deployed contract. Chain values are served at runtime, so no chain id, RPC, or address is baked into the client.
- **`script/SingleWalletRun.s.sol`** — one wallet walking the whole lifecycle, on the record.
- **`demo/CLICKS.md`** — the clicks-and-narration script for the walkthrough, website only.
- **`demo/NARRATION.md`** — the narration as recorded, with the cut list: what was trimmed out of the raw take and why.

## Architecture

One contract, one state machine, and no place for a human to intervene.

| Piece | What it is | Where |
|---|---|---|
| The venue | escrow, counted units, the takeover, and the arithmetic that settles it | `src/Spectral.sol` |
| The rule | bond ≥ 50% of the remaining escrow; escrow = units × price, exact by construction | `src/Spectral.sol` |
| The suite | 25 lifecycle and adversarial tests | `test/Spectral.t.sol` |
| The matrix | 235 generated guards: states × operations × actors | `test/SpectralMatrix.t.sol` |
| The generator | writes the matrix, so the coverage is inspectable rather than hand-waved | `test/gen_matrix_tests.py` |
| The verifier | re-reads every claim off the chain | `verify.py` |
| The lifecycle scripts | deploy, drive, and finalise a real run | `script/` |
| The gate scripts | attempt the invalid actions against the deployed contract | `script/LiveGatesOpen.s.sol`, `script/LiveGatesClose.s.sol` |
| The venue UI | landing and dashboard, reading the chain in the browser | `app/` |

The six states are `Open → Stalled → Listed → Taken → Settled | Closed`, and `Closed` is not an error state: it is where the taker forfeited and the buyer gained. There are exactly two terminal states and both of them move money by rule.

## The continuation loop, step by step

```
createJob        buyer escrows units × pricePerUnit (exact, no rounding dust)
countUnit        the responsible party counts one finished unit, with its receipt hash
declareStalled   the executor any time; anyone once the work deadline has passed
listObligation   permissionless — the venue is not a gatekeeper
takeObligation   a taker posts a bond of at least half the remaining escrow
countUnit        the taker counts the remaining units
─────── all units counted ───────
settle           executor paid for the units it counted; taker paid the remainder + its bond
─────── or the taker never finishes ───────
closeFailed      executor paid for its units; buyer refunded the remainder AND keeps the bond
```

Two details carry most of the weight. **Receipts are per unit index, and a unit index can only ever be counted once**, so the count is not a claim, it is a mapping that cannot be written twice. And **the responsible party is the only one who can count**: the executor while the job is open, the taker while it is taken. Nobody inflates anyone else's total on their behalf.

## Where the guarantee is enforced

| Guarantee | Where it lives | The test that covers it |
|---|---|---|
| Escrow is exact — no rounding dust, nothing stranded | `createJob` requires `msg.value == totalUnits * pricePerUnit` | `testCreateRequiresExactEscrow`, `test_escrow_one_wei_short_refused` |
| A unit cannot be counted twice | `unitReceipt[jobId][unitIndex]` set once, then immutable | `testUnitCannotBeCountedTwice`, `test_index_0_duplicate_refused` |
| Only the responsible party may count | one branch for the open executor, one for the taken taker | `testStrangerCannotCount`, `test_matrix_taken_countByExecutor` |
| A row that is not owed is refused | `require(receipt != 0)` — a count with no receipt is not a count | `testZeroReceiptRefused`, `test_matrix_open_countByExecutor` |
| Money is conserved in every terminal path | `credits` plus in-flight escrow always equals the balance | `testFuzzConservation` (256 runs), `testFuzz_matrix_conservation` |
| A failed taker forfeits the bond to the buyer | `closeFailed` adds the bond to the buyer's credit | `testTakerFailureForfeitsBondToBuyer`, `test_matrix_taken_closeLateFromTaken` |
| Nobody can make the venue pay out more than it holds | `claim` zeroes the credit before the transfer | `testReentrantClaimCannotDrainAnotherJob`, `test_isolation_second_claim_refused` |
| Deadlines cannot be read early | `block.timestamp` compared in both directions | `test_takerdeadline_before_closes`, `test_workdeadline_before_by_stranger` |
| The bond is exactly half the remainder, always | one formula, asserted at every remainder | `test_bond_formula_1_units_remain` … `test_bond_formula_7_units_remain` |

## Who approves what

Nobody approves anything, and that is the point rather than a slogan. There is no approval function to call and no key with which to call it.

- **The buyer** funds the job and, if the taker fails, is refunded the remainder and keeps the bond. It cannot reclaim money from a live job.
- **The executor** counts its own units while the job is open and can quit at any moment. It cannot count units twice, and it cannot count a unit it did not assign a receipt to.
- **The taker** posts a bond to claim the remainder and counts its own units. It cannot touch the executor's units or the buyer's escrow.
- **Anyone at all** may declare a stall after the work deadline, list an obligation, or close a failed takeover after the taker deadline. Those three are deliberately permissionless, and none of them moves money on its own: a listing does not pay anyone, and closing a failed takeover follows a rule the taker's own failure triggered.

## Engineering decisions & the traps that taught me something

**A view call inside a pranked call's arguments eats the prank.** This one is worth the paragraph. In a Foundry test, `vm.prank(taker); venue.takeObligation{value: venue.requiredBond(id)}(id);` does not call `takeObligation` as the taker: the `requiredBond` view call consumes the prank, so the venue records the *test contract* as the taker. Two of my conformance cells were "passing" for entirely the wrong reason, and the only reason I caught it is that one cell asked the taker to count a unit and got `NotExecutor`. Every `takeObligation` site now hoists the bond read above the prank and asserts the recorded taker is the intended taker.

**A verifier with hardcoded wallets reports on itself, not on the venue.** `verify.py` originally checked three addresses typed into the script. When I mined a fourth job whose credits belonged to the same three parties, it printed **9/10**, a false failure, because the script was comparing the venue's balance against wallets it had chosen in advance. It now reads the participants out of the jobs and separates owed money from money still in flight. A verifier that only works on its author's deployment is not a verifier.

**`overflow-x: hidden` on a wrapper silently kills `position: sticky`.** The layered card scroll in the landing page stopped pinning, with no error and no warning. Putting `overflow-x` on the wrapper made it a scroll container, so the sticky children had nothing to stick to. Moved to `<body>`, and the trace now shows the cards pinned at 111px and 144px with the tuck scaling as designed.

**A bare `1fr` track floors at its content's min-content width.** The obligations table's executor column held a truncated address that wanted 97px. With `1fr` the track refused to shrink below that, so the row came out 765px wide inside a 627px column, and the `overflow-x-auto` wrapper quietly hid the escrow column, the one number the table exists to show. Reducing the fixed tracks and flooring the address at `minmax(0,1fr)` brings the row to 627 and the table fits its container at the most common desktop width. Found by measuring `scrollWidth` against `clientWidth` on the live page, not by looking at it; a screenshot of a clipped column had been sitting in my own README draft.

**`vm.warp` cannot move a live chain's clock.** The first version of the lifecycle script took the taker deadline forward by warping, which only works on a local fork. Split into `LiveGatesOpen` and `LiveGatesClose` so the second half runs after real wall-clock time has passed the deadline, which is also why the honest record of that run includes a real wait.

**`expectRevert` is unreliable under `--broadcast`.** Refusal paths cannot be asserted on a live chain the way they are in a test, so the live gates take a different route: they send the invalid call, decode the revert the contract itself returns, and record the raw bytes in [docs/live-gates-raw.json](docs/live-gates-raw.json).

**Two failures that were information, not obstacles.** A board that rendered empty without a wallet looked like a chain problem and was an architecture problem: reads now go over RPC from the served config, so the venue shows the truth to a visitor with no wallet at all. And a job with a price of zero looked like an edge case that should be rejected, until writing it down made the answer obvious: it escrows nothing and settles to nothing, so it is vacuous rather than unsafe, and it is tested as such (`testZeroPriceJobIsVacuousNotUnsafe`).

## What's real vs pending — the honesty table

The point of this project is mechanical proof, so the same standard applies to this file. Every row names the artifact behind it, and where prose and artifact disagree, **the artifact is the authority**.

| | State | Evidence |
|---|---|---|
| The mechanism: six states, the takeover, the bond rule, arithmetic settlement | **Real — tested** | `src/Spectral.sol`, 194 lines; the conformance matrix covers every state × operation × actor |
| Conservation: every wei is owed or in flight | **Real — tested** | `testFuzzConservation` and `testFuzz_matrix_conservation`, plus `verify.py` re-deriving it against the deployed balance |
| Escrow exactness, no dust, no stranded wei | **Real — tested** | `testCreateRequiresExactEscrow`, `test_escrow_one_wei_short_refused`, `test_escrow_one_wei_over_refused` |
| Unit receipts are per-index and cannot be overwritten | **Real — tested** | `test_index_0_duplicate_refused` … `test_index_9_duplicate_refused` |
| Integer edges: zero price, overflowing escrow, out-of-range index | **Real — tested, one mined on chain** | `testZeroPriceJobIsVacuousNotUnsafe`, `testCreateRejectsOverflowingEscrow`, and the live overflow attempt in [docs/LIVE-GATES.md](docs/LIVE-GATES.md) |
| Reentrancy | **Real — tested with a constructed attacker** | `testReentrantClaimCannotDrainAnotherJob`: the attacker earns a real credit, re-enters mid-payout, receives exactly its own credit, and cannot touch another job's balance |
| Full lifecycle on a live chain | **Real — executed** | 40 public transactions on testnet 1952; six jobs, and every state the machine has; `verify.py` 22/22 |
| The whole lifecycle from ONE wallet | **Real — executed** | `script/SingleWalletRun.s.sol`: job 5 named the same address as its executor, then took its own obligation over as taker — six states, settled, 0.002 OKB credited to that one address. The contract restricts addresses, not how many wallets you hold |
| A taker who never finishes forfeits the bond to the buyer | **Real — executed on the deployed contract** | [docs/LIVE-GATES.md](docs/LIVE-GATES.md) job 3: buyer credit 0.00375 = remainder 0.0025 + bond 0.00125, executor 0.0005, taker 0; credits sum == venue balance, read back from the chain |
| Seven invalid actions refused by the deployed bytecode | **Real — evaluated by the live contract** | each with the contract's own reason; raw revert data in [docs/live-gates-raw.json](docs/live-gates-raw.json) |
| The venue application | **Real — verified in a browser** | landing and venue both read the contract anonymously; six jobs, 42 registered units and 21 counted on screen; every unit index shown with its on-chain receipt hash; 0px horizontal overflow |
| Hosted public URL | **Real — verified anonymously** | https://spectral-venue.vercel.app — `/` and `/app` return 200 with no login, `/api/config` serves live chain values |
| The recorded walkthrough | **Real — recorded and published** | [▶ the demo](https://youtu.be/EK-t91r63Fw), 2:15, a single take of the deployed venue driven with a real wallet; the two transactions it creates are in [docs/RECEIPTS.md](docs/RECEIPTS.md), and the narration and its cut list are in `demo/NARRATION.md` |
| Source verification on the explorer | **Not attempted, not claimed** | the explorer's verification route is gated behind a paid plan and the credential is not obtainable; stated here so no badge implies otherwise |
| A takeover by someone outside this build | **Not yet — stated plainly** | no wallet other than the testnet actors in this build has taken over an obligation, and no third party has described the mechanism in public. The mechanism is exercised; the market for it is not |
| Mainnet | **Not deployed — scope** | testnet only, deliberately. See [How I'd deploy it](#how-id-deploy-it) |
| MetaMask's site warning on the hosted URL | **Flagged by their security partner; not yet reported** | MetaMask's own detector clears the host (`eth-phishing-detect` returns `false` for it, and `true` for a known typosquat, so the control passes), which means the verdict comes from the reputation service behind it rather than the list the extension ships. It reads a brand-new free-hosting subdomain that asks to connect a wallet as the drainer pattern, which is what this is. The venue reads every number without a wallet, so nothing in this repository depends on connecting one |
| ERC-20 escrow | **Built — in a second deployment of the same machine** | `src/SpectralToken.sol` escrows an ERC-20 instead of native value, with the asset `immutable`. Live on testnet 1952 at `0x232a35C819BEcf3D10eA24Aa3E7F9aC616B287B5`, escrowing `tTSLA` (`0x7E7789c15E2792798176533d8843935947732b3C`, a replica deployed here, open faucet). Two jobs run end to end, 31 transactions, `verify_token.py` 15/15, receipts in [docs/TOKEN-MARKET.md](docs/TOKEN-MARKET.md). What remains scope: that market is written by script, not from the app's wallet flow, and its asset is a replica rather than an issued equity |

## Attack → test

| Attack | Answer | Where |
|---|---|---|
| "I'll count the same unit twice" | the receipt mapping is per unit index and is written once; the second attempt reverts `UnitAlreadyCounted()` | `countUnit`; `testUnitCannotBeCountedTwice`, `test_index_0_duplicate_refused` |
| "I'll count units for someone else" | only the responsible party may count — executor while open, taker while taken | `countUnit`; `testStrangerCannotCount`, `test_matrix_taken_countByExecutor` |
| "I'll count a unit with no receipt" | a zero receipt is refused before anything is written | `EmptyReceipt`; `testZeroReceiptRefused` |
| "I'll count unit 10,000 on a ten-unit job" | the index is range-checked against `totalUnits` | `UnitOutOfRange`; `test_wide_index_20_refused` |
| "I'll take the obligation with a token bond" | the bond is compared against half the remaining escrow, exactly | `BondTooSmall(required)`; `test_bond_one_wei_short_7_units_remain` |
| "I'll take it twice and keep both slots" | the first taker moves the state to `Taken`; the second reverts `NothingToTake()` | `takeObligation`; `test_isolation_two_takers_one_slot` |
| "I'll close a takeover early" | the taker deadline is checked before anything settles | `DeadlineNotReached`; `test_takerdeadline_before_closes` |
| "I'll re-enter `claim` and drain the venue" | the credit is zeroed **before** the transfer, and a constructed attacker is given a real credit and a second job to steal from | `claim`; `testReentrantClaimCannotDrainAnotherJob` |
| "I'll claim twice" | the credit is zeroed on the first claim; the second reverts `NothingToClaim()` | `claim`; `test_isolation_second_claim_refused` |
| "I'll make the venue insolvent with a huge price" | `totalUnits * pricePerUnit` panics on overflow instead of wrapping | `createJob`; `testCreateRejectsOverflowingEscrow`, `test_escrow_overflow_max_both` |
| "I'll leave a job half-alive and lock someone's money" | a live job's escrow is accounted as in flight, not as lost; `verify.py` fails if the balance stops matching | `verify.py`; its fourth invariant |
| "The README's numbers are aspirational" | every figure here is re-derivable: the suite prints the test count, and `verify.py` reads the chain | `forge test`, `verify.py` |

## The app

Next.js 16 on the app router, one design system across two surfaces, and no chain value hardcoded in the client.

**The landing page** at `/` explains the rule and deliberately carries **no chain state at all**: no addresses, no balances, no counters that could go stale. **The venue** at `/app` is the working surface: the obligations as they stand, the units counted against each, the escrow, and every action. It reads the contract over RPC at render time, so it shows the truth to a visitor with no wallet installed; a wallet is only needed to sign.

Every row carries its executor address as a link to the explorer, so any claim on screen can be checked in one click. The opened obligation lists **every unit index with the receipt hash stored on chain against it** — job #2 shows seven counted indices and the three that are still free — so the thing the mechanism actually rests on is visible in the product rather than only in the tests, and the free index is the one to count next instead of sending a transaction the contract will refuse. The dashboard renders six live obligations: `#1 Settled 10/10`, `#2 Closed 7/10`, `#3 Closed 1/6`, `#4 Open 0/3`, `#5 Settled 3/3` — created, executed and taken over by a single address — and `#6 Stalled 0/10`, the job the walkthrough opens and stalls on camera.

## Read the market from anywhere — the board API

The market has a read surface with no wallet, no key and no login in front of it: whatever can make an HTTP request can ask this contract who is owed what right now.

```bash
$ curl -s "https://spectral-venue.vercel.app/api/board?job=6"
{"chain":{"id":1952,"name":"X Layer testnet","venue":"0x2899eb09…","nativeSymbol":"OKB","blockNumber":41870458,…},
 "totals":{"jobs":1,"totalUnits":10,"countedUnits":0,"liveJobs":1,"lockedInLiveJobs":{"wei":"10000000000000000","okb":"0.01"}},
 "jobs":[{"id":6,"state":"Stalled","stateCode":1,"takeable":false,"countedUnits":0,"remainingUnits":10,
          "escrow":{"wei":"10000000000000000","okb":"0.01"},…}]}
```

`GET /api/board` alone returns all six jobs (21 of 42 units counted, 0.01 OKB still locked at the time of writing); `?state=Listed` narrows it to the takeable remainders, which is empty while no remainder is listed.

```bash
$ cd app && npm install      # ethers is the reader's only dependency
$ node scripts/board-cli.mjs --rpc https://testrpc.xlayer.tech/terigon \
    --venue 0x2899eb0972f86cc90d054d19a5816233d9af56d9 --symbol OKB
6 job(s) · 21/42 units counted · 2 live · 0.01 OKB still locked

  id  state     counted   remaining   escrow            bond required   takeable
   6  Stalled    0/10        10            0.01 OKB            0 OKB   no
   5  Settled    3/3          0          0.0015 OKB            0 OKB   no
```

- `GET /api/board` — every job, newest first. `?job=6` for one, `?state=Listed` for the takeable remainders.
- `app/lib/board.mjs` — the reader itself: one exported function (`readBoard`) plus `readTakeable`. No framework, no Next, no React, so another project can import it as-is.
- `app/scripts/board-cli.mjs` — the same module in a terminal, `--json` for agents, exit code `2` on a failed read.
- Field meanings, the state numbering, and the exact contract calls to act on what you read: [docs/BOARD-API.md](docs/BOARD-API.md).

It is read-only by construction — the endpoint holds no key and there is no route that takes an action — and it reads the contract directly at request time rather than from an indexer, so what you get is the contract's own answer, `remainingUnits` and `requiredBond` included.

## Limitations

- **The contract cannot tell whether work is good.** It counts units and refuses duplicates. Whether a receipt corresponds to *acceptable* work is a judgement the buyer made when it chose the executor and the unit count. The mechanism makes that judgement small and explicit; it does not make it.
- **A unit is only as meaningful as the job's definition of one.** A job of ten vague units is worse than a job of two clear ones, and no contract can fix a badly specified job.
- **No partial credit within a unit.** A unit is counted or it is not. A job with two coarse units cannot represent 90% done.
- **The buyer funds everything up front.** There is no credit, no instalments, and no outside capital.
- **No privacy.** Every job, count, and credit is public. That is what makes it verifiable, and it is also a real constraint.
- **Testnet only.** A public testnet with faucet gas, not mainnet, so nothing here should be pointed at real value.
- **The token-denominated market is script-driven.** Its two jobs were run by `script/TokenMarket.s.sol` and `script/TokenFailClose.s.sol` with keys from the environment; the app shows that market read-only, not as a signing flow. A wallet-driven version is a UI problem, not a contract problem — the contract is the same one, with `transferFrom` in place of `msg.value`.
- **The equity it escrows is a replica.** `tTSLA` is this project's own ERC-20 on the testnet with an open faucet. It is not an issued asset, it tracks nothing, and it is not obtainable anywhere else. The market is real; the asset is a stand-in, and it is labelled as one everywhere it appears.
- **The unit is undecided in the general case.** For machine work the executor's own receipt hash is usually enough; for work with an external consumer there is no general answer, and this project states the limit rather than hiding it behind a service.

## Security

- **No admin surface exists.** No owner, no pause, no upgrade, no settable parameter. The way to change the rules is to deploy a different contract.
- **Money moves only through `claim`, and `claim` is pull-based.** Credits are zeroed before the transfer, so a re-entrant caller finds nothing to take twice.
- **The reentrancy surface is one function by design.** There are no callbacks, no hooks, and no external calls anywhere except the payout in `claim`.
- **The bond is a penalty, not a fee.** It returns in full to a taker that finishes, and forfeits entirely to the buyer if it does not.
- **Deadlines are the only clock.** Both are compared in both directions, and both are tested at the exact boundary second.
- **Private keys never touch this repository.** `.env` is gitignored at mode 600; only `.env.example` is tracked; every key lives in the environment. Every deployment key in this build's history was generated locally and one was rotated after it appeared in a terminal dump.

## Tech stack

- **Solidity 0.8.24** + **Foundry** — contract, tests, and lifecycle scripts
- **Python 3** — `verify.py` and `verify_token.py`, chain re-derivation over plain JSON-RPC
- **Next.js 16** / React 19 (app router) — landing and venue
- **Tailwind v4** compiled at build time (no CDN)
- **X Layer testnet 1952** — chain id `0x7a0`, gas token OKB

## Project layout

```
spectral/
├── src/Spectral.sol               the venue: escrow · counted units · takeover · settlement
├── src/SpectralToken.sol          the same machine, escrowing an ERC-20 instead of native value
├── src/TestnetEquity.sol          the replica equity that deployment escrows (open faucet)
├── test/Spectral.t.sol            25 lifecycle and adversarial tests
├── test/SpectralMatrix.t.sol      235 generated guards: states × operations × actors
├── test/SpectralToken.t.sol       28 tests for the token-denominated deployment, reentrancy included
├── test/gen_matrix_tests.py       writes the matrix, so the coverage is inspectable
├── script/                        Deploy · Demo · Finalize · LiveGatesOpen · LiveGatesClose · SingleWalletRun
├── script/TokenMarket.s.sol       deploys the token market and runs both jobs on a live chain
├── script/TokenFailClose.s.sol    closes the failed job after the real taker deadline passes
├── verify.py                      re-reads every claim off the chain, prints N/N
├── verify_token.py                the same re-read for the ERC-20-denominated market
├── app/                           Next.js 16: landing at / and the venue at /app
│   ├── lib/board.mjs              the market's read API as one framework-free function
│   ├── scripts/board-cli.mjs      the same reader in a terminal (--json for agents)
│   ├── components/TokenMarket.jsx the second market, read-only, on the venue page
│   └── app/api/board/route.js     GET /api/board — keyless, read-only JSON
├── docs/BOARD-API.md              endpoint, field glossary, and the calls to act on it
├── docs/TOKEN-MARKET.md           the replica equity, the token market, and its receipts
├── docs/RECEIPTS.md               70 transaction hashes, testnet and local
├── docs/LIVE-GATES.md             the seven refusals and the money path, on chain
├── docs/live-gates-raw.json       the raw revert data, undecoded
├── demo/CLICKS.md                 the clicks-and-narration script (website only)
├── demo/NARRATION.md              the narration as recorded, and what the cut removed
├── demo/media/                    the demo video, its poster frame, and the screenshots
├── lib/forge-std/                 vendored test dependency — committed so a fresh clone runs the suite
├── LICENSE                        MIT
└── foundry.toml
```

## Full command reference

```bash
forge build
forge test                                   # 288 tests, 0 failures

# re-derive the claims from the chain (no key, no credential, nothing trusted)
RPC_URL=https://testrpc.xlayer.tech/terigon \
  VENUE=0x2899eb0972f86cc90d054d19a5816233d9af56d9 JOBS=1,2,3,4 python3 verify.py

# the same re-read for the market that escrows the replica equity
RPC_URL=https://testrpc.xlayer.tech/terigon \
  VENUE=0x232a35C819BEcf3D10eA24Aa3E7F9aC616B287B5 JOBS=1,2 python3 verify_token.py

# deploy (testnet only; the key comes from the environment, there is no default)
cp .env.example .env
forge script script/Deploy.s.sol --rpc-url $XLAYER_TESTNET_RPC --broadcast

# the venue application
cd app && npm install && npm run dev         # http://localhost:5173
```

Read from the environment and never committed:

```
CHAIN_ID, RPC_URL, EXPLORER_URL, VENUE_ADDRESS     chain and deployment
DEPLOYER_PRIVATE_KEY                               deploy only; there is no fallback
TESTNET_*, ACTOR_*                                 the funded testnet wallets used in the recorded run
```

## How I'd deploy it

Not deployed to mainnet, and that is the honest state rather than a broken link.

- **The chain.** The contract is chain-agnostic Solidity with no precompiles, no oracles and no token interfaces, so mainnet is a redeploy rather than a rewrite. It stays on testnet here because a public faucet is the right amount of real for a mechanism this young.
- **The verification.** Contract source verification on the explorer needs a credential behind a paid plan, so it is not claimed. The bytecode is public and every claim is re-derivable from it without that badge.
- **The host.** The venue is a Next.js server because the chain config is served at runtime from `/api/config` rather than baked into the client, which is also why it is not a static export. On a static host the chain values would have to be compiled in, and the front end would start lying the moment the deployment moved.
- **At real scale.** Reads would move from per-render RPC calls to an indexer with the contract as the source of truth, and the board would page. Both are convenience; neither changes what settles a job.

## Results and supporting records

Nothing below is a screenshot standing in for evidence. Each row is an artifact you can open, and where prose and artifact disagree, **the artifact is the authority**.

| Evidence | What it supports |
|---|---|
| [▶ the demo](https://youtu.be/EK-t91r63Fw) · [`demo/media/spectral-demo.mp4`](demo/media/spectral-demo.mp4) | one take of the deployed venue against testnet, with the two transactions it creates openable |
| [`docs/LIVE-GATES.md`](docs/LIVE-GATES.md) | the seven refusals evaluated by the deployed bytecode, and the money path of job 3 closed by rule |
| [`docs/RECEIPTS.md`](docs/RECEIPTS.md) | 70 transaction hashes — 40 public on testnet 1952, 30 local on anvil — each openable, including the eight that make up the single-wallet run and the two that make up job 6 |
| [`docs/live-gates-raw.json`](docs/live-gates-raw.json) | the raw revert data, so the refusals can be re-checked without trusting my decoding |
| `verify.py` | 22/22 re-derived from the chain, including that the venue holds exactly what it owes |
| `test/SpectralMatrix.t.sol` + `test/gen_matrix_tests.py` | the conformance matrix and the generator that writes it |
| `test/Spectral.t.sol` | the lifecycle, the 256-run conservation fuzz, and the constructed reentrancy attacker |
| https://spectral-venue.vercel.app | the running product, anonymous, reading six live obligations |
| `demo/CLICKS.md` | the walkthrough script, in clicks and narration |

## Tests

```
$ forge test
Suite result: ok. 25 passed; 0 failed; 0 skipped; finished in 125.71ms
Suite result: ok. 235 passed; 0 failed; 0 skipped; finished in 295.86ms

Ran 2 test suites: 260 tests passed, 0 failed, 0 skipped (260 total tests)
```

By file:

```
test/Spectral.t.sol             25    lifecycle, fuzz, the reentrancy attack, integer edges
test/SpectralMatrix.t.sol      235    generated: 6 states × every operation × every actor,
                                      bond boundaries, deadlines, arithmetic, events, isolation
                               ---
                               260
```

The matrix is the part worth looking at. Every cell is a distinct guard: a state, an operation, an actor, and the exact error selector or resulting state that must follow. A weakened guard anywhere fails a *named* cell. Regenerate it with `python3 test/gen_matrix_tests.py`; the file is output, so edit the generator. It is also how the prank bug above was found: one cell asked the taker to count, and the contract answered `NotExecutor()`.

One caveat on everything above: nothing in this file is aspirational. If a line here is not backed by an artifact you can run, it is a bug in the file. I would rather you reported it than trusted it.

## License

MIT. See [LICENSE](LICENSE).
