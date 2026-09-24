import React, { useEffect } from "react";
import { useVenue, STATES, STATE_TONE, shortAddr, asNum } from "./venue.js";
import Toasts from "./Toasts.jsx";
import "./papercraft.css";

const ago = (ms) => {
  if (!ms) return "–";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)} min ago`;
};

/* One re-usable paper-cut sticker mark. */
const Mark = ({ className = "w-8 h-8" }) => (
  <svg className={className} viewBox="0 0 36 36" fill="currentColor" aria-hidden="true">
    <path d="M7 13.5C7 9.91 9.91 7 13.5 7c2.82 0 5.23 1.79 6.1 4.31C20.47 8.79 22.88 7 25.7 7c3.59 0 6.5 2.91 6.5 6.5 0 3.05-2.09 5.61-4.92 6.31L18 31 8.72 19.81C5.89 19.11 3.8 16.55 3.8 13.5" />
  </svg>
);

export default function Landing() {
  const v = useVenue();
  const { cfg, cfgError, stats, jobs, chainOk, loading, readError, lastReadAt } = v;

  /* scroll reveal, independent of any sticky behaviour */
  useEffect(() => {
    const nodes = document.querySelectorAll(".reveal-card, .reveal-figure, [data-reveal]");
    if (!("IntersectionObserver" in window)) { nodes.forEach((n) => n.classList.add("is-revealed")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (!e.isIntersecting) return;
        e.target.style.setProperty("--reveal-delay", `${Math.min(i * 70, 280)}ms`);
        e.target.classList.add("is-revealed");
        io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [jobs.length]);

  /* the landing is its own sheet of paper: keep the dashboard's canvas out of it */
  useEffect(() => {
    document.body.classList.add("papercraft-body");
    return () => document.body.classList.remove("papercraft-body");
  }, []);

  if (cfgError) {
    return (
      <main className="papercraft min-h-screen bg-paper-cream flex items-center justify-center p-6">
        <div className="sticker max-w-2xl p-10 text-ink-charcoal">
          <h1 className="text-2xl font-semibold tracking-tight">Refusing to run without chain configuration</h1>
          <p className="mt-4 text-ink-muted">{cfgError}</p>
          <p className="mt-4 text-sm text-ink-muted">
            Required: CHAIN_ID, CHAIN_NAME, RPC_URL, EXPLORER_URL, NATIVE_SYMBOL, FAUCET_URL, VENUE_ADDRESS.
            There are no defaults in the code, so this app can never quietly talk to the wrong chain.
          </p>
        </div>
      </main>
    );
  }

  const unit = cfg?.nativeSymbol || "";
  const taken = jobs.filter((j) => j.taker !== "0x0000000000000000000000000000000000000000").length;

  return (
    <main className="papercraft min-h-screen bg-paper-cream text-ink-charcoal antialiased overflow-x-hidden">
      {/* floating island navigation */}
      <header className="fixed top-4 left-0 right-0 z-50 flex items-center justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto pill-chrome px-4 sm:px-5 py-2.5 rounded-full flex items-center gap-3 sm:gap-6 border border-black/5 w-full max-w-[1100px] justify-between">
          <a href="/" className="flex items-center gap-2 pr-2 shrink-0" aria-label="Obligo home">
            <Mark className="w-7 h-7 text-brand-green" />
            <span className="text-lg font-bold tracking-tight">Obligo</span>
          </a>
          <div className="hidden md:flex items-center gap-6">
            <a href="#method" className="label-pill text-ink-muted hover:text-ink-charcoal transition-colors">How it settles</a>
            <a href="#board" className="label-pill text-ink-muted hover:text-ink-charcoal transition-colors">The board</a>
            <a href="#limits" className="label-pill text-ink-muted hover:text-ink-charcoal transition-colors">Limits</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {cfg && (
              <span className={`hidden sm:inline-flex label-caps px-3 py-1.5 rounded-full ${chainOk === false ? "bg-brand-coral text-white" : "bg-paper-sand text-ink-charcoal"}`}>
                {cfg.chainName} · {cfg.chainId}
              </span>
            )}
            <a href="/app" className="inline-flex items-center gap-3 bg-brand-coral hover:bg-brand-coral-hover text-white label-pill rounded-full pl-5 pr-1.5 py-1.5 press">
              Open the venue
              <span className="w-8 h-8 rounded-full bg-white/25 grid place-items-center" aria-hidden="true">→</span>
            </a>
          </div>
        </nav>
      </header>

      {/* hero curtain */}
      <section className="relative w-full bg-brand-green min-h-[96vh] flex flex-col justify-between pt-32 pb-10 px-6 overflow-hidden rounded-b-[48px]">
        <span className="char-float absolute top-40 right-8 w-16 h-16 rounded-full bg-brand-yellow hidden lg:block" aria-hidden="true" />
        <span className="char-float-delay absolute top-64 right-32 w-10 h-10 rounded-full bg-brand-lilac hidden lg:block" aria-hidden="true" />
        <span className="absolute bottom-24 left-6 w-24 h-24 rounded-full bg-white/25 hidden lg:block" aria-hidden="true" />

        <div className="max-w-[1360px] mx-auto w-full flex-1 flex flex-col justify-center">
          <p className="label-caps text-ink-charcoal/70">Onchain work settlement · countable units</p>
          <h1 className="hero-title mt-5 max-w-[15ch]">
            Unfinished work, <em className="font-semibold italic">still payable</em>.
          </h1>
          <div className="mt-8 flex flex-col lg:flex-row lg:items-end gap-8 lg:justify-between">
            <p className="max-w-[54ch] text-lg leading-7 text-ink-charcoal/85">
              A job is a set of countable units. When the executor stops, the units it never counted are listed,
              another party takes them over against a bond, and settlement is arithmetic over what was counted.
            </p>
            <div className="flex flex-wrap gap-3 shrink-0">
              <a href="/app" className="inline-flex items-center gap-3 bg-brand-coral hover:bg-brand-coral-hover text-white label-pill rounded-full pl-7 pr-2 py-3 press">
                Open the venue
                <span className="w-9 h-9 rounded-full bg-white/25 grid place-items-center" aria-hidden="true">→</span>
              </a>
              <a href={cfg?.faucetUrl} target="_blank" rel="noreferrer" className="ghost-pill hover-lift text-ink-charcoal label-pill rounded-full px-7 py-3">
                Get testnet {unit}
              </a>
            </div>
          </div>
        </div>

        {/* live numbers, straight from the contract */}
        <div className="max-w-[1360px] mx-auto w-full">
          <div className="flex flex-wrap gap-3" data-reveal="live-strip">
            <span className="bg-white/90 label-pill rounded-full px-5 py-2.5">
              <b className="font-semibold">{loading ? "…" : stats.counted}</b> of {stats.units} units counted
            </span>
            <span className="bg-white/90 label-pill rounded-full px-5 py-2.5">
              <b className="font-semibold">{stats.live}</b> obligation{stats.live === 1 ? "" : "s"} live
            </span>
            <span className="bg-white/90 label-pill rounded-full px-5 py-2.5">
              <b className="font-semibold">{stats.settled + stats.closed}</b> settled or closed by rule
            </span>
            <span className="bg-ink-charcoal/85 text-white label-pill rounded-full px-5 py-2.5 font-mono text-xs">
              {cfg ? shortAddr(cfg.venue) : "…"}
            </span>
          </div>
        </div>
      </section>

      {/* editorial intro */}
      <section className="py-24 sm:py-32 px-6 max-w-[1360px] mx-auto">
        <p className="label-caps text-ink-muted">The mechanism</p>
        <h2 className="big-section-title mt-4 max-w-[20ch]">The obligation outlives the agent.</h2>
        <div className="mt-10 grid md:grid-cols-2 gap-8 max-w-[1100px]">
          <p className="text-lg leading-7 text-ink-charcoal">
            A failed job normally becomes a dispute: someone must decide whether the work counted, and
            a human has to be persuaded. Here the unit is the only thing that settles anything.
          </p>
          <p className="text-lg leading-7 text-ink-muted">
            The contract never judges quality and never asks an oracle. It counts per-unit receipts,
            refuses a second attempt at the same index, and moves money by rules that were fixed when
            the job was opened.
          </p>
        </div>
      </section>

      {/* alternating pillars on the paper spine */}
      <section id="method" className="relative py-24 overflow-hidden">
        <div className="spine" aria-hidden="true" />
        <div className="max-w-[1360px] mx-auto px-6 relative">
          <h2 className="big-section-title text-center max-w-[22ch] mx-auto" data-reveal="method-title">
            Three rules, no discretion anywhere in between.
          </h2>

          <div className="mt-20 flex flex-col gap-16">
            {[
              {
                n: "01",
                side: "left",
                tone: "bg-brand-green text-ink-charcoal",
                title: "The units are escrowed",
                body: "Escrow must equal units × price exactly. The contract rejects any other amount, so no rounding dust can exist anywhere in the system.",
                detail: "Escrow arithmetic is checked on chain, not trusted.",
              },
              {
                n: "02",
                side: "right",
                tone: "bg-brand-coral text-white",
                title: "The executor stops",
                body: "Whatever it counted stays with it. The units it never counted become a listed obligation with a takeover window — not a refund and not a dispute.",
                detail: "Counted pay is final at the moment it is counted.",
              },
              {
                n: "03",
                side: "left",
                tone: "bg-brand-yellow text-ink-charcoal",
                title: "A taker finishes it",
                body: "Against a bond of at least half the remaining escrow. Count every unit and the bond comes back with the pay; miss the deadline and the bond goes to the buyer.",
                detail: "No dispute to file. No jury to persuade.",
              },
            ].map((s, i) => (
              <div key={s.n} className={`flex ${s.side === "right" ? "lg:justify-end" : "lg:justify-start"}`}>
                <article className="sticker reveal-card lg:w-[47%] w-full p-8 sm:p-10" style={{ "--reveal-delay": `${i * 70}ms` }}>
                  <div className="flex items-center gap-4">
                    <span className={`${s.tone} w-12 h-12 rounded-full grid place-items-center font-semibold`}>{s.n}</span>
                    <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">{s.title}</h3>
                  </div>
                  <p className="mt-5 text-base leading-6 text-ink-charcoal/85">{s.body}</p>
                  <p className="mt-5 label-pill text-ink-muted">{s.detail}</p>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* green call-to-action banner */}
      <section className="relative bg-brand-green text-ink-charcoal pt-20 pb-24 px-6 overflow-hidden">
        <div className="max-w-[1360px] mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div>
            <p className="label-caps text-ink-charcoal/70">Take the work, not the blame</p>
            <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight mt-3 max-w-[24ch]">
              Anyone can finish a listed obligation — the chain decides who gets paid.
            </h2>
          </div>
          <a href="/app" className="inline-flex items-center gap-3 bg-ink-charcoal text-paper-cream label-pill rounded-full pl-7 pr-2 py-3 press hover:opacity-90 shrink-0">
            Go to the board
            <span className="w-9 h-9 rounded-full bg-white/15 grid place-items-center" aria-hidden="true">→</span>
          </a>
        </div>
      </section>

      {/* metrics showcase — every figure read from the contract */}
      <section id="metrics" className="py-24 sm:py-28 px-6 max-w-[1360px] mx-auto">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="label-caps text-ink-muted">Read live</p>
            <h2 className="big-section-title mt-3 max-w-[18ch]">The numbers the contract is holding.</h2>
          </div>
          <p className="label-pill text-ink-muted">
            {readError ? "read failed — retry below" : `updated ${ago(lastReadAt)}`}
          </p>
        </div>
        {readError && (
          <div className="mt-6 bg-brand-coral text-white label-pill rounded-full px-6 py-3 inline-flex items-center gap-4">
            Could not read the venue: {readError}
            <button onClick={() => v.load()} className="bg-white/25 rounded-full px-4 py-1.5">Retry</button>
          </div>
        )}
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { v: stats.counted, l: "units counted", s: `of ${stats.units} registered across every job` },
            { v: taken, l: "obligations taken over", s: "unfinished work assumed by a second party" },
            { v: stats.settled, l: "settled", s: `${stats.closed} more closed by rule` },
            { v: asNum(stats.locked), l: `${unit} still escrowed`, s: "held by the contract, not by us" },
          ].map((m, i) => (
            <article key={m.l} className="sticker reveal-card p-8" style={{ "--reveal-delay": `${i * 60}ms` }}>
              <div className="stat-display">{loading ? "…" : m.v}</div>
              <p className="mt-3 text-base font-medium">{m.l}</p>
              <p className="mt-1 text-sm leading-5 text-ink-muted">{m.s}</p>
            </article>
          ))}
        </div>
      </section>

      {/* the board — real obligations as sticker cards */}
      <section id="board" className="py-24 px-6 max-w-[1360px] mx-auto">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div>
            <p className="label-caps text-ink-muted">The board</p>
            <h2 className="big-section-title mt-3 max-w-[18ch]">Every obligation the chain knows about.</h2>
          </div>
          <a href="/app" className="ghost-pill hover-lift rounded-full px-6 py-3 label-pill">Open the dashboard →</a>
        </div>

        {loading ? (
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <div className="sticker p-8 h-48" /><div className="sticker p-8 h-48" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="mt-12 sticker reveal-card p-10 sm:p-14 text-center">
            <h3 className="text-3xl font-semibold tracking-tight">No obligation has been opened yet</h3>
            <p className="mt-4 text-ink-muted max-w-[52ch] mx-auto">
              Opening one escrows units × price against a named executor and a deadline. From that moment
              every counted unit is paid, and the rest becomes transferable.
            </p>
            <a href="/app" className="mt-8 inline-flex items-center gap-3 bg-brand-coral hover:bg-brand-coral-hover text-white label-pill rounded-full pl-7 pr-2 py-3 press">
              Open the first job
              <span className="w-9 h-9 rounded-full bg-white/25 grid place-items-center" aria-hidden="true">→</span>
            </a>
          </div>
        ) : (
          <div className="mt-12 grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {jobs.map((j, i) => {
              const remaining = j.totalUnits - j.executorUnits - j.takerUnits;
              const tone = STATE_TONE[STATES[j.state]];
              const chip = tone === "success" ? "bg-brand-green text-ink-charcoal"
                : tone === "warning" ? "bg-brand-yellow text-ink-charcoal"
                : tone === "danger" ? "bg-brand-coral text-white"
                : tone === "neutral" ? "bg-paper-sand text-ink-charcoal"
                : "bg-brand-sky text-white";
              return (
                <article key={j.id} className="sticker reveal-card p-8 flex flex-col" style={{ "--reveal-delay": `${Math.min(i * 60, 240)}ms` }}>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-2xl font-semibold tracking-tight">Job #{j.id}</span>
                    <span className={`${chip} label-caps px-4 py-1.5 rounded-full`}>{STATES[j.state]}</span>
                  </div>
                  <p className="mt-5 font-mono text-xs text-ink-muted break-all">{j.executor}</p>
                  <dl className="mt-6 space-y-3 text-sm">
                    <div className="flex justify-between gap-4 border-b border-ink-charcoal/10 pb-2">
                      <dt className="text-ink-muted">Counted</dt>
                      <dd className="font-semibold tabular-nums">{j.executorUnits + j.takerUnits} of {j.totalUnits}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-ink-charcoal/10 pb-2">
                      <dt className="text-ink-muted">Still open</dt>
                      <dd className="font-semibold tabular-nums">{remaining} units</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-b border-ink-charcoal/10 pb-2">
                      <dt className="text-ink-muted">Escrow</dt>
                      <dd className="font-semibold tabular-nums">{asNum(j.escrow, 6)} {unit}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-ink-muted">Deadline</dt>
                      <dd className="font-semibold">{new Date(j.workDeadline * 1000).toLocaleDateString()}</dd>
                    </div>
                  </dl>
                  <a href="/app" className="mt-auto pt-6 label-pill text-ink-charcoal underline decoration-brand-coral decoration-2 underline-offset-4">
                    {remaining > 0 && j.state !== 4 && j.state !== 5 ? "Take it over →" : "See how it settled →"}
                  </a>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* limits, stated rather than hidden — this band replaces any logo wall */}
      <section id="limits" className="py-24 px-6 overflow-hidden" data-reveal="limits">
        <div className="max-w-[1360px] mx-auto text-center">
          <p className="label-caps text-ink-muted">Stated limits</p>
          <h2 className="big-section-title mt-4 max-w-[24ch] mx-auto">What this deliberately does not do.</h2>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {["No quality judgement", "No oracle", "No admin key", "No pause or upgrade", "No leverage", "No jury"].map((t) => (
              <span key={t} className="bg-white rounded-full px-5 py-2.5 label-pill border border-ink-charcoal/10">{t}</span>
            ))}
          </div>
          <p className="mt-10 text-lg leading-7 text-ink-muted max-w-[68ch] mx-auto">
            Whether a receipt corresponds to genuinely good work is the buyer's acceptance rule — the contract
            counts units and refuses duplicates, nothing more. Source verification, hosting and the recorded
            walkthrough are listed as not finished in the repository's status file.
          </p>
        </div>
      </section>

      {/* storybook sunshine footer */}
      <footer className="bg-brand-yellow text-ink-charcoal pt-20 pb-10 px-6 sm:px-12 rounded-t-[48px] overflow-hidden">
        <div className="max-w-[1360px] mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
            <div>
              <p className="label-caps text-ink-charcoal/70">Non-custodial · testnet</p>
              <h2 className="text-5xl sm:text-6xl font-semibold tracking-tight mt-3 max-w-[16ch]">
                Let’s <em className="italic">settle</em> something.
              </h2>
            </div>
            <a href="/app" className="inline-flex items-center gap-3 bg-ink-charcoal text-brand-yellow label-pill rounded-full pl-7 pr-2 py-3 press hover:opacity-90 shrink-0">
              Open the venue
              <span className="w-9 h-9 rounded-full bg-white/15 grid place-items-center" aria-hidden="true">→</span>
            </a>
          </div>

          <div className="mt-16 grid sm:grid-cols-3 gap-10 max-w-[900px]">
            <div>
              <p className="label-caps text-ink-charcoal/60">Venue</p>
              <a className="block mt-3 label-pill hover:underline" href={`${cfg?.explorerUrl}/address/${cfg?.venue}`} target="_blank" rel="noreferrer">Contract ↗</a>
              <a className="block mt-3 label-pill hover:underline" href="/app">Dashboard</a>
              <a className="block mt-3 label-pill hover:underline" href="#limits">Limits</a>
            </div>
            <div>
              <p className="label-caps text-ink-charcoal/60">Chain</p>
              <a className="block mt-3 label-pill hover:underline" href={cfg?.faucetUrl} target="_blank" rel="noreferrer">Faucet ↗</a>
              <a className="block mt-3 label-pill hover:underline" href={cfg?.explorerUrl} target="_blank" rel="noreferrer">Explorer ↗</a>
              <a className="block mt-3 label-pill hover:underline" href="/api/config">Served config</a>
            </div>
            <div>
              <p className="label-caps text-ink-charcoal/60">This page</p>
              <p className="mt-3 text-sm leading-5 text-ink-charcoal/80">
                Every number is read from the contract when the page renders. Nothing is seeded, cached or mocked.
              </p>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-ink-charcoal/15 flex flex-wrap items-center justify-between gap-4">
            <span className="font-mono text-xs break-all">{cfg ? cfg.venue : ""}</span>
            <span className="label-pill flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${chainOk === false ? "bg-brand-coral" : "bg-brand-green-dark"}`} aria-hidden="true" />
              {chainOk === false ? "wallet on a different network" : `read OK · updated ${ago(lastReadAt)}`}
            </span>
          </div>
        </div>
      </footer>

      <Toasts txs={v.txs} dismissTx={v.dismissTx} cfg={cfg} />
    </main>
  );
}
