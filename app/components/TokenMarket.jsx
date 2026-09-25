/* The ERC-20 markets, read on the server and operable from the page.
 *
 * The native-value market is the one this app has always signed for. These panels show the
 * other deployments of the same state machine, each denominated in an ERC-20: the replica
 * equity that exists only on this testnet, and — where the deployment configures it — the
 * chain's own testnet dollar. Each panel reads its market at request time, so the numbers are
 * the chain's own, and because this renders on the server the market is in the HTML: visible to
 * a reader with JavaScript disabled, to a scraper, and to anyone who opens the page before the
 * client bundle has finished loading.
 *
 * Every amount is formatted with the ASSET's decimals, read from the token. Nothing here
 * assumes 18.
 */
import abi from "../lib/abi.json";
import { readBoard, readDecimals } from "../lib/board.mjs";
import { listMarkets } from "../lib/market-config";
import TokenConsole from "./TokenConsole.jsx";

/* The refresh window lives in app/app/page.jsx (`export const revalidate`), because route
   segment config is only read from a page or layout, not from a component. */

async function loadBoard(market) {
  if (!market?.venue) return { error: `no address configured for the ${market?.key} market` };
  try {
    const board = await readBoard({
      rpcUrl: process.env.RPC_URL,
      venue: market.venue,
      abi,
      explorerUrl: process.env.EXPLORER_URL || "",
      nativeSymbol: market.symbol,
      decimals: market.asset ? await readDecimals(process.env.RPC_URL, market.asset) : 18,
      chainId: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : null,
      chainName: process.env.CHAIN_NAME || "",
    });
    return { board };
  } catch (e) {
    return { error: e?.shortMessage || e?.message || String(e) };
  }
}

function Panel({ market, board, error, anchor }) {
  if (error) {
    return (
      <section id={anchor} className="mx-8 lg:mx-16 mb-16 rounded-3xl bg-paper-sand p-8 lg:p-10">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="bg-brand-lilac label-caps px-3 py-1 rounded-full">{market.key} market</span>
        </div>
        <h2 className="text-2xl font-semibold text-ink-charcoal mb-2">{market.symbol}-denominated market</h2>
        <p className="text-sm text-ink-muted">{error}</p>
      </section>
    );
  }

  const sym = board.chain?.nativeSymbol || market.symbol;
  const amt = (v) => v[sym.toLowerCase()] || v.wei;
  const explorer = board.chain.explorer;
  const link = (addr) => (explorer ? `${explorer}/address/${addr}` : "#");
  const replica = market.faucet;

  return (
    <section id={anchor} className="mx-8 lg:mx-16 mb-16 rounded-3xl bg-paper-sand p-8 lg:p-10">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="bg-brand-lilac label-caps px-3 py-1 rounded-full">{board.totals.jobs > 0 ? "market" : "market"}</span>
        <span className="label-caps text-ink-muted">denominated in {sym}</span>
      </div>

      <h2 className="text-2xl font-semibold text-ink-charcoal mb-3">
        The same state machine, with escrow and bonds in {replica ? "an equity-shaped token" : "the chain's own dollar"}
      </h2>

      <p className="text-sm text-ink-muted max-w-3xl mb-6">
        Escrow and bonds here are <strong className="text-ink-charcoal">{sym}</strong>
        {market.asset ? (
          <>
            {" ("}
            <a
              className="underline decoration-brand-green decoration-2 underline-offset-4 font-mono text-xs"
              href={link(market.asset)}
              target="_blank"
              rel="noreferrer"
            >
              {market.asset}
            </a>
            {")"}
          </>
        ) : null}
        {replica ? (
          <>
            , a tokenized-equity-shaped ERC-20 that exists only on this testnet: a replica with no issuer, no share behind
            it and an open faucet.
          </>
        ) : (
          <>
            , the stablecoin this chain issues for itself on testnet — mintable only under its own issuer&apos;s rules, so
            the console points at the faucet rather than pretending to mint it.
          </>
        )}{" "}
        The market is a separate deployment of the same contract at{" "}
        <a
          className="underline decoration-brand-green decoration-2 underline-offset-4 font-mono text-xs"
          href={link(board.chain.venue)}
          target="_blank"
          rel="noreferrer"
        >
          {board.chain.venue}
        </a>{" "}
        — read here, and run from here: open a job, count a unit against its receipt, declare a stall, list the
        remainder, take one over, close one that failed and claim what you are owed, each one a signed transaction with
        its block on screen.
      </p>

      <div className="rounded-2xl bg-paper-white p-6">
        <div className="flex items-center justify-between border-b border-ink-charcoal/10 pb-3 mb-1">
          <span className="label-caps text-ink-muted">job</span>
          <span className="label-caps text-ink-muted">state · counted · remaining · escrow · bond</span>
        </div>
        {board.jobs.map((j) => (
          <div
            key={j.id}
            className="flex items-center justify-between gap-6 border-b border-ink-charcoal/10 py-3 last:border-0"
          >
            <span className="font-mono text-xs text-ink-charcoal">#{j.id}</span>
            <span className="text-sm text-ink-charcoal text-right">
              {j.state} · {j.countedUnits}/{j.totalUnits} · {j.remainingUnits} left ·{" "}
              <strong>{amt(j.escrow)}</strong> {sym} escrow · {amt(j.bond)} {sym} bond
              {j.takeable ? ` · takeable for a ${amt(j.requiredBondToTake)} ${sym} bond` : ""}
            </span>
          </div>
        ))}
        {board.jobs.length === 0 && <p className="text-sm text-ink-muted py-3">no jobs on this market</p>}
      </div>

      <p className="text-sm text-ink-muted mt-5">
        {board.totals.jobs} job(s) · {board.totals.countedUnits}/{board.totals.totalUnits} units counted ·{" "}
        {amt(board.totals.lockedInLiveJobs)} {sym} still locked in live jobs · block{" "}
        <span className="font-mono text-xs">{board.chain.blockNumber}</span> · read{" "}
        <span className="font-mono text-xs">{board.chain.readAt}</span>
        {board.chain.decimals != null ? ` · ${board.chain.decimals} decimals read from the asset (amounts trimmed for reading)` : ""}
      </p>

      <TokenConsole market={market} />
    </section>
  );
}

export default async function TokenMarket() {
  const markets = listMarkets().filter((m) => m.kind === "erc20");
  if (markets.length === 0) return null;

  const loaded = await Promise.all(
    markets.map(async (m) => ({ market: m, ...(await loadBoard(m)) })),
  );

  return (
    <>
      {loaded.map((x, i) => (
        <Panel
          key={x.market.key}
          market={x.market}
          board={x.board}
          error={x.error}
          anchor={i === 0 ? "second-market" : `market-${x.market.key}`}
        />
      ))}
    </>
  );
}
