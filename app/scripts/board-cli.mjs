#!/usr/bin/env node
/* spectral board — read this market from a terminal, no wallet, no key, no login.
 *
 *   node scripts/board-cli.mjs --rpc https://testrpc.xlayer.tech/terigon \
 *     --venue 0x2899eb0972f86cc90d054d19a5816233d9af56d9
 *
 *   node scripts/board-cli.mjs ... --state Listed      only takeable remainders
 *   node scripts/board-cli.mjs ... --job 6             one job
 *   node scripts/board-cli.mjs ... --json              machine-readable, for an agent
 *
 * The same module backs GET /api/board, so a script and the hosted endpoint agree by
 * construction. Exit codes: 0 read OK, 2 read failed.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readBoard, STATES } from "../lib/board.mjs";

const here = dirname(fileURLToPath(import.meta.url));

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    if (key === "json") { out.json = true; continue; }
    out[key] = argv[++i];
  }
  return out;
}

const a = args(process.argv.slice(2));
if (a.help || !a.rpc || !a.venue) {
  console.error(
    "usage: node scripts/board-cli.mjs --rpc <url> --venue <address> [--state " +
      STATES.join("|") + "] [--job N] [--json] [--symbol OKB] [--explorer <url>]",
  );
  process.exit(a.help ? 0 : 2);
}

const abi = JSON.parse(readFileSync(join(here, "..", "lib", "abi.json"), "utf8"));

try {
  const board = await readBoard({
    rpcUrl: a.rpc,
    venue: a.venue,
    abi,
    explorerUrl: a.explorer || "",
    nativeSymbol: a.symbol || "OKB",
    job: a.job === undefined ? null : Number(a.job),
    state: a.state || null,
  });

  if (a.json) {
    process.stdout.write(JSON.stringify(board, null, 2) + "\n");
  } else {
    const t = board.totals;
    console.log(
      `\n${board.chain.name || "chain " + board.chain.id} · venue ${board.chain.venue}\n` +
        `block ${board.chain.blockNumber} · read ${board.chain.readAt}\n` +
        `${t.jobs} job(s) · ${t.countedUnits}/${t.totalUnits} units counted · ` +
        `${t.liveJobs} live · ${t.lockedInLiveJobs[board.chain.nativeSymbol.toLowerCase()]} ` +
        `${board.chain.nativeSymbol} still locked\n`,
    );
    console.log("  id  state     counted   remaining   escrow            bond required   takeable");
    for (const j of board.jobs) {
      const sym = board.chain.nativeSymbol.toLowerCase();
      const unit = board.chain.nativeSymbol;
      console.log(
        `  ${String(j.id).padStart(2)}  ${j.state.padEnd(8)} ${String(j.countedUnits).padStart(3)}/${String(j.totalUnits).padEnd(9)}` +
          `${String(j.remainingUnits).padStart(3)}      ${String(j.escrow[sym]).padStart(10)} ${unit}   ` +
          `${String(j.requiredBondToTake[sym]).padStart(10)} ${unit}   ${j.takeable ? "yes" : "no"}`,
      );
    }
    console.log("");
  }
} catch (e) {
  console.error("board read failed:", e?.shortMessage || e?.message || String(e));
  process.exit(2);
}
