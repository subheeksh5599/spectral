"use client";

/* The second market, read not written.
 *
 * The native-value market is the one this app signs for. This panel shows the other
 * deployment of the same state machine, denominated in tTSLA — a tokenized-equity-shaped
 * ERC-20 that exists only on this testnet. The read is the same public endpoint, pointed at
 * a different contract, so what is on screen is the chain and not a story about the chain.
 *
 * Writes for this market are script-driven (scripts/TokenMarket.s.sol), not wallet-driven
 * from here, and the panel says so rather than implying a button that does not exist.
 */
import { useEffect, useState } from "react";

export default function TokenMarket() {
  const [board, setBoard] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/board?market=token")
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          if (d.error) setErr(d.error);
          else setBoard(d);
        })
        .catch((e) => alive && setErr(String(e)));
    load();
    const t = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (err) {
    return (
      <section className="panel">
        <h2>Second market — not configured on this deployment</h2>
        <p className="muted">{err}</p>
      </section>
    );
  }
  if (!board) {
    return (
      <section className="panel">
        <h2>Second market</h2>
        <p className="muted">reading the token-denominated market…</p>
      </section>
    );
  }

  const sym = board.chain?.nativeSymbol || "tTSLA";
  const amt = (v) => v[sym.toLowerCase()] || v.wei;

  return (
    <section className="mx-8 lg:mx-16 mb-16 rounded-3xl bg-paper-sand p-8 lg:p-10">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="bg-brand-lilac label-caps px-3 py-1 rounded-full">second market</span>
        <span className="label-caps text-ink-muted">denominated in {sym}</span>
      </div>

      <h2 className="text-2xl font-semibold text-ink-charcoal mb-3">
        The same state machine, with escrow and bonds in an equity-shaped token
      </h2>

      <p className="text-sm text-ink-muted max-w-3xl mb-6">
        Escrow and bonds here are <strong className="text-ink-charcoal">{sym}</strong>, a tokenized-equity-shaped
        ERC-20 that exists only on this testnet: a replica with no issuer, no share behind it and an open faucet.
        The market is a separate deployment of the same contract at{" "}
        <a
          className="underline decoration-brand-green decoration-2 underline-offset-4 font-mono text-xs"
          href={board.chain.explorer ? `${board.chain.explorer}/address/${board.chain.venue}` : "#"}
          target="_blank"
          rel="noreferrer"
        >
          {board.chain.venue}
        </a>{" "}
        — read here, written by <code className="font-mono text-xs">script/TokenMarket.s.sol</code>, since signing
        for it is a scripted demo rather than a button on this page.
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
