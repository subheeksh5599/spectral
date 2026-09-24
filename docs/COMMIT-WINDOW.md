# The build window, as the repository records it

The hackathon's build period runs 17–25 September 2026. Every commit in this repository falls on
2026-09-24, between 16:55 and 22:45 local time — 18 commits.

There is no back-dated history here and nothing was reconstructed after the fact: the whole tree
was written and committed in one pass, and the chain evidence carries its own timestamps (the
deployment and both lifecycle runs are dated the same day; see `docs/RECEIPTS.md` and
`docs/LIVE-GATES.md`).

| Commit | When | What |
|---|---|---|
| `766492b` | 2026-09-24 22:45 | checklist: A10 states the verification route is gated, not a free self-serve key |
| `c4da075` | 2026-09-24 22:17 | landing: remove all photography (unrelated stock images); band becomes a graphic panel, case cards carry their own chips and copy |
| `07007a3` | 2026-09-24 22:14 | header: drop the two-line menu button and its repeating panel; sidebar: drop the chain-status line and the redundant landing pill |
| `81ebfb9` | 2026-09-24 22:12 | landing: restore the metric deck's layered scroll (overflow-x on <body> only, so sticky pins again) |
| `1122f53` | 2026-09-24 22:10 | landing: restore the source's metric numerals (6 / 4 / 0) and keep only the wording changed |
| `b86981a` | 2026-09-24 22:08 | dashboard sidebar: remove the Navigation label; make the Spectral wordmark an obvious link back to the landing |
| `8ea1fdc` | 2026-09-24 22:01 | port to Next.js 16 (app router, /api/config); add the missing base reset so links stop rendering default blue+underlined; fix the intro illustration viewBox |
| `2ab7eed` | 2026-09-24 21:55 | rename to Spectral; dashboard rebuilt on the landing's design language (one design system, no cramping, zero overflow at four widths) |
| `02108f3` | 2026-09-24 21:43 | landing: header centred, logo mark removed, every header control made real (nav links + working menu panel + CTA disc fill) |
| `12232c7` | 2026-09-24 21:40 | landing: 1:1 port of the operator's frontend (artwork, sections, classes unchanged, copy rewritten); removed all live chain data, chain badge and faucet link from the landing |
| `05ce421` | 2026-09-24 21:35 | landing: rebuilt on the operator's papercraft frontend (warm paper, sticker radii, coral action tone); Tailwind compiled at build time, canvas scoped so the dashboard is unaffected |
| `2d6a739` | 2026-09-24 21:26 | app: landing page + dashboard rebuilt on the supplied 71UI contract (white canvas, one accent, 32px controls, 40px rows); shared venue hook with transaction toasts |
| `7f40ea1` | 2026-09-24 20:37 | app: surface rebuilt on the supplied style contract; reads no longer require a wallet; self-hosted fonts |
| `8a7e9c9` | 2026-09-24 17:17 | app: self-contained .env loader (zsh-safe), serves testnet config; verified live against the deployed contract |
| `77b91a4` | 2026-09-24 17:15 | obligo: deploy + full lifecycle on public X Layer testnet (0x2899eb…), interface built and wired, receipts with explorer links, verify 10/10 |
| `a90c1fe` | 2026-09-24 17:03 | obligo: full lifecycle on a live chain (30 real tx), verify.py re-reads claims from chain (10/10), live refusals decoded |
| `f33922a` | 2026-09-24 16:55 | checklist: tick items with local evidence; mark C1 partial and G7/G10 honestly |
| `f95d3a8` | 2026-09-24 16:55 | obligo: obligation-continuation venue, slice 1 (contract + fuzz-tested invariants, no UI yet) |

## What the repository says about the project's own limits

The commits that matter most for judging are the ones where the project corrects itself rather than
the ones where it adds a feature:

- `f33922a` — the checklist ticks what has local evidence and explicitly marks two gates as not
  done, rather than leaving them ambiguous.
- `766492b` — the source-verification gate is recorded as *unavailable*, not merely pending: the
  credential route is gated and the project stops claiming it.
- `8ea1fdc` — a missing base reset meant every link rendered browser-default blue and underlined,
  and an illustration had a `4x4` viewBox against `400x400` artwork so it never appeared. Both were
  found by rendering the page and measuring it, not by reading the code.

## Reproduce

```bash
git log --date=format:'%Y-%m-%d %H:%M' --pretty=format:'%h|%ad|%s'
```
