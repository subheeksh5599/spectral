/* The second market, read not written — rendered on the server.
 *
 * The native-value market is the one this app signs for. This panel shows the other
 * deployment of the same state machine, denominated in tTSLA: a tokenized-equity-shaped
 * ERC-20 that exists only on this testnet. It reads the market at request time, so the
 * numbers are the chain's own — and because it renders on the server, the market is in the
 * HTML: visible to a reader with JavaScript disabled, to a scraper, and to anyone who opens
 * the page before the client bundle has finished loading.
 *
 * Writes for this market are script-driven (script/TokenMarket.s.sol), not wallet-driven
 * from here, and the panel says so rather than implying a button that does not exist.
 */
import abi from "../lib/abi.json";
import { readBoard } from "../lib/board.mjs";

/* The refresh window lives in app/app/page.jsx (`export const revalidate`), because route
   segment config is only read from a page or layout, not from a component. */

async function loadBoard() {
  const venue = process.env.TOKEN_MARKET_ADDRESS;
  if (!venue) return { error: "TOKEN_MARKET_ADDRESS is not set on this deployment" };

  try {
    const board = await readBoard({
      rpcUrl: process.env.RPC_URL,
      venue,
      abi,
      explorerUrl: process.env.EXPLORER_URL || "",
      nativeSymbol: process.env.TOKEN_SYMBOL || "tTSLA",
      chainId: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : null,
      chainName: process.env.CHAIN_NAME || "",
    });
    return { board, asset: process.env.TOKEN_ASSET_ADDRESS || null };
  } catch (e) {
    return { error: e?.shortMessage || e?.message || String(e) };
  }
}

export default async function TokenMarket() {
  const { board, asset, error } = await loadBoard();

  if (error) {
    return (
      <section id="second-market" className="mx-8 lg:mx-16 mb-16 rounded-3xl bg-paper-sand p-8 lg:p-10">
        <h2 className="text-2xl font-semibold text-ink-charcoal mb-2">Second market</h2>
        <p className="text-sm text-ink-muted">{error}</p>
      </section>
    );
  }

  const sym = board.chain?.nativeSymbol || "tTSLA";
  const amt = (v) => v[sym.toLowerCase()] || v.wei;
  const explorer = board.chain.explorer;
  const link = (addr) => (explorer ? `${explorer}/address/${addr}` : "#");

  return (
    <section id="second-market" className="mx-8 lg:mx-16 mb-16 rounded-3xl bg-paper-sand p-8 lg:p-10">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="bg-brand-lilac label-caps px-3 py-1 rounded-full">second market</span>
        <span className="label-caps text-ink-muted">denominated in {sym}</span>
      </div>

      <h2 className="text-2xl font-semibold text-ink-charcoal mb-3">
        The same state machine, with escrow and bonds in an equity-shaped token
      </h2>

      <p className="text-sm text-ink-muted max-w-3xl mb-6">
        Escrow and bonds here are <strong className="text-ink-charcoal">{sym}</strong>
        {asset ? (
          <>
            {" ("}
            <a
              className="underline decoration-brand-green decoration-2 underline-offset-4 font-mono text-xs"
              href={link(asset)}
              target="_blank"
              rel="noreferrer"
            >
              {asset}
            </a>
            {")"}
          </>
        ) : null}
        , a tokenized-equity-shaped ERC-20 that exists only on this testnet: a replica with no issuer, no
        share behind it and an open faucet. The market is a separate deployment of the same contract at{" "}
        <a
          className="underline decoration-brand-green decoration-2 underline-offset-4 font-mono text-xs"
          href={link(board.chain.venue)}
          target="_blank"
          rel="noreferrer"
        >
          {board.chain.venue}
        </a>{" "}
        — read here, written by <code className="font-mono text-xs">script/TokenMarket.s.sol</code>, since
        signing for it is a scripted demo rather than a button on this page.
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
      </p>
    </section>
  );
}
