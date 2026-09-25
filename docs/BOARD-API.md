# The obligation board — a public read API

This market can be read without a wallet, a key, a login or a contract ABI. One endpoint,
one shape, and a CLI that speaks the same module.

Nothing here writes. Nothing here signs. Every number comes from the deployed contract
over RPC when the request is made.

## Endpoint

```
GET https://spectral-venue.vercel.app/api/board
GET https://spectral-venue.vercel.app/api/board?job=6
GET https://spectral-venue.vercel.app/api/board?state=Listed
```

| Parameter | Values | Meaning |
|---|---|---|
| `job` | job id | one job, newest-first order preserved |
| `state` | `Open` \| `Stalled` \| `Listed` \| `Taken` \| `Settled` \| `Closed` | only jobs in that state |

Responses carry `Cache-Control: public, s-maxage=10, stale-while-revalidate=30`: the board
is chain state, so ten seconds of edge caching is the whole allowance. Chain identity comes
from the deployment's own environment variables, so the endpoint cannot drift from the
contract the venue renders.

## Response

Real output, `?job=6`, 25 Sep 2026:

```json
{
  "chain": {
    "id": 1952, "name": "X Layer testnet",
    "venue": "0x2899eb0972f86cc90d054d19a5816233d9af56d9",
    "explorer": "https://www.okx.com/web3/explorer/xlayer-test",
    "nativeSymbol": "OKB", "readAt": "2026-09-25T09:40:05.949Z", "blockNumber": 41870367
  },
  "totals": { "jobs": 1, "totalUnits": 10, "countedUnits": 0, "liveJobs": 1,
              "lockedInLiveJobs": { "wei": "10000000000000000", "okb": "0.01" } },
  "jobs": [
    {
      "id": 6, "state": "Stalled", "stateCode": 1, "takeable": false,
      "buyer": "0x…", "executor": "0x…", "taker": "0x0000000000000000000000000000000000000000",
      "totalUnits": 10, "executorUnits": 0, "takerUnits": 0,
      "countedUnits": 0, "remainingUnits": 10,
      "pricePerUnit": { "wei": "1000000000000000", "okb": "0.001" },
      "escrow": { "wei": "10000000000000000", "okb": "0.01" },
      "bond": { "wei": "0", "okb": "0" },
      "requiredBondToTake": { "wei": "0", "okb": "0" },
      "workDeadline": 0, "takerDeadline": 0
    }
  ]
}
```

| Field | Meaning |
|---|---|
| `state` / `stateCode` | the contract's own numbering: `0 Open`, `1 Stalled`, `2 Listed`, `3 Taken`, `4 Settled`, `5 Closed` |
| `takeable` | true exactly while `state` is `Listed` — the window in which a bond can claim the remainder |
| `countedUnits` | `executorUnits + takerUnits`, read from the tuple, never inferred |
| `remainingUnits` | the contract's `remainingUnits(id)`, not arithmetic done by the endpoint |
| `requiredBondToTake` | the contract's `requiredBond(id)` for a listed job: the exact bond that must accompany a takeover, zero for any other state |
| `escrow` / `bond` / `pricePerUnit` | `wei` is exact and always safe to use; the second key is the **escrowed asset's own symbol** (`okb` in the native market, `tTSLA` and `usd₮0` in the token ones), with the amount divided by that asset's own `decimals()` and trimmed for reading |
| `workDeadline` / `takerDeadline` | unix seconds, `0` where the state has not set one |

## Read it yourself, without HTTP

The endpoint is a thin shell over `app/lib/board.mjs` — no framework, no Next, no React. Its only dependency is `ethers`, so install it once from the app directory first:

```bash
cd app && npm install        # ethers is the only dependency this reader needs
```

```bash
node scripts/board-cli.mjs --rpc https://testrpc.xlayer.tech/terigon \
  --venue 0x2899eb0972f86cc90d054d19a5816233d9af56d9 --symbol OKB

chain 1952 · venue 0x2899eb0972f86cc90d054d19a5816233d9af56d9
6 job(s) · 21/42 units counted · 2 live · 0.01 OKB still locked

  id  state     counted   remaining   escrow            bond required   takeable
   6  Stalled    0/10        10            0.01 OKB            0 OKB   no
   5  Settled    3/3          0          0.0015 OKB            0 OKB   no
   …
```

`--json` prints the same object the endpoint returns; `--state Listed` and `--job 6` filter.
Exit code is `0` on a clean read and `2` on a failed one, so a script can branch on it.

Importing the module instead:

```js
import { readBoard, readTakeable } from "./lib/board.mjs";

const takeable = await readTakeable({ rpcUrl, venue, abi });   // only Listed jobs
const board = await readBoard({ rpcUrl, venue, abi, nativeSymbol: "OKB" });
```

## Acting on what you read

Reading is free and keyless. Acting is a normal transaction from your own wallet — this
API never touches a key and cannot move anything:

| Step | Contract call |
|---|---|
| claim a remainder | `takeObligation(uint256 jobId)` — send `requiredBondToTake.wei` with it |
| finish a unit you took | `countUnit(uint256 jobId, uint256 unitIndex, bytes32 receipt)` |
| declare a job stalled | `declareStalled(uint256 jobId)` — the executor any time, anyone after the work deadline |
| list the remainder | `listObligation(uint256 jobId, uint256 takerDeadline)` — permissionless; the second argument is the deadline the taker must finish by, not a price |
| take your credit | `claim()` — pull-based, zeroes the credit before it pays |

`abi.json` in `app/lib/` is the ABI those calls are made through, and
[RECEIPTS.md](RECEIPTS.md) has a worked example of every one of them on chain.

## What this is not

- **Not an indexer.** Every request reads the contract directly. If the deployment moves,
  the environment moves with it; nothing is cached in a database here.
- **Not authenticated and not rate-limited by anything but the edge cache.** It is a
  read of public chain state, so there is nothing to protect.
- **Not a write path.** There is no endpoint that takes an action, and no key exists in
  this deployment that could sign one.
