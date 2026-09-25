#!/usr/bin/env node
/* spectral-board — read an obligation market straight from the chain.
 *
 *   npx spectral-board                    the native-value market, live on X Layer testnet
 *   npx spectral-board --market token      the ERC-20 market (tTSLA, a replica)
 *   npx spectral-board --state Listed      only the remainders anyone can take over
 *   npx spectral-board --job 6             one job
 *   npx spectral-board --json              machine-readable, for an agent
 *
 *   npx spectral-board --rpc <url> --venue <address> [--symbol OKB] [--decimals 18]
 *
 * Read-only by construction: no key, no wallet, no signature, no write path. Exit codes:
 * 0 read OK, 2 read failed, 0 for --help.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

let readBoard, STATES, readDecimals;
try {
  ({ readBoard, STATES, readDecimals } = await import("../lib/board.mjs"));
} catch (e) {
  console.error(
    "spectral-board could not load its reader:\n  " + (e?.message || String(e)) +
      "\nIf this is a partial install, reinstall it: npm i -g spectral-board",
  );
  process.exit(2);
}

const here = dirname(fileURLToPath(import.meta.url));
const defaults = JSON.parse(readFileSync(join(here, "..", "lib", "markets.json"), "utf8"));

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    if (["json", "help", "list-markets"].includes(key)) { out[key] = true; continue; }
    out[key] = argv[++i];
  }
  return out;
}

const a = args(process.argv.slice(2));

if (a.help) {
  console.log(
    `spectral-board — read an obligation market from the chain. No key, no login.\n\n` +
      `  --market <key>      which deployment to read: ${defaults.markets.map((m) => m.key).join(", ")}` +
      ` (default ${defaults.markets[0].key})\n` +
      `  --rpc <url>         read your own deployment instead of the default\n` +
      `  --venue <address>   the market contract, with --rpc\n` +
      `  --symbol <SYM>      what the escrowed asset is called (default OKB)\n` +
      `  --decimals <n>      only for your own deployment; on the defaults it is read from the asset\n` +
      `  --state <STATE>     ${STATES.join(" | ")}\n` +
      `  --job <N>           one job\n` +
      `  --json              the whole board as JSON\n` +
      `  --list-markets      the deployments this package knows about\n\n` +
      `Docs: https://github.com/subheeksh5599/spectral`,
  );
  process.exit(0);
}

if (a["list-markets"]) {
  for (const m of defaults.markets) {
    console.log(`${m.key.padEnd(8)} ${m.venue}  ${m.label}`);
  }
  console.log(`\nchain: ${defaults.chain.name} (${defaults.chain.id}) · ${defaults.chain.rpcUrl}`);
  process.exit(0);
}

const market = a.venue
  ? { key: a.market || "custom", venue: a.venue, symbol: a.symbol || "OKB", asset: null }
  : defaults.markets.find((m) => m.key === (a.market || defaults.markets[0].key));

if (!market) {
  console.error(
    `no such market: ${a.market}. Known: ${defaults.markets.map((m) => m.key).join(", ")}` +
      ` (or pass --rpc and --venue for your own).`,
  );
  process.exit(2);
}

const rpcUrl = a.rpc || defaults.chain.rpcUrl;
const symbol = a.symbol || market.symbol;

try {
  /* On the defaults, the divisor is the asset's own decimals — read from the token rather
     than assumed, because a 6-decimal dollar and an 18-decimal replica must not share one. */
  let decimals = a.decimals !== undefined ? Number(a.decimals) : 18;
  if (a.decimals === undefined && market.asset) decimals = await readDecimals(rpcUrl, market.asset);

  const board = await readBoard({
    rpcUrl,
    venue: market.venue,
    abi: JSON.parse(readFileSync(join(here, "..", "lib", "abi.json"), "utf8")),
    explorerUrl: defaults.chain.explorer,
    nativeSymbol: symbol,
    chainId: a.venue ? null : defaults.chain.id,
    chainName: a.venue ? "" : defaults.chain.name,
    job: a.job === undefined ? null : Number(a.job),
    state: a.state || null,
    decimals,
  });

  if (a.json) {
    process.stdout.write(JSON.stringify(board, null, 2) + "\n");
  } else {
    const t = board.totals;
    const sym = symbol.toLowerCase();
    console.log(
      `\n${board.chain.name || "chain " + board.chain.id} · ${market.key} market · ${board.chain.venue}\n` +
        `${t.jobs} job(s) · ${t.countedUnits}/${t.totalUnits} units counted · ${t.liveJobs} live · ` +
        `${t.lockedInLiveJobs[sym]} ${symbol} still locked · block ${board.chain.blockNumber}\n`,
    );
    console.log("  id  state     counted   remaining   escrow            bond to take    takeable");
    for (const j of board.jobs) {
      console.log(
        `  ${String(j.id).padStart(2)}  ${j.state.padEnd(8)} ${String(j.countedUnits).padStart(3)}/${String(j.totalUnits).padEnd(9)}` +
          `${String(j.remainingUnits).padStart(3)}      ${String(j.escrow[sym]).padStart(10)} ${symbol}   ` +
          `${String(j.requiredBondToTake[sym]).padStart(10)} ${symbol}   ${j.takeable ? "yes" : "no"}`,
      );
    }
    console.log("");
  }
} catch (e) {
  console.error("board read failed:", e?.shortMessage || e?.reason || e?.message || String(e));
  process.exit(2);
}
