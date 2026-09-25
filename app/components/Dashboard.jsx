"use client";

import React, { useMemo, useState, useEffect } from "react";
import { parseEther, keccak256, toUtf8Bytes } from "ethers";
import { useVenue, readReceipts, STATES, STATE_TONE, ZERO, shortAddr, asNum } from "../lib/venue.js";
import Toasts from "./Toasts.jsx";

const ago = (ms) => {
  if (!ms) return "–";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  return s < 60 ? `${s}s ago` : `${Math.round(s / 60)} min ago`;
};

/* Input guards. Bad input must never reach the chain as a mysterious "refused"
   toast, and must never throw uncaught: these return null on anything invalid so
   the caller can report exactly what was wrong. */
const posInt = (s) => { const n = Number(s); return Number.isInteger(n) && n > 0 ? n : null; };
const posNum = (s) => { const n = Number(s); return Number.isFinite(n) && n > 0 ? n : null; };
const idxInt = (s) => { const n = Number(s); return Number.isInteger(n) && n >= 0 ? n : null; };

/* state chips carry the landing's palette so a state reads the same on both pages */
const CHIP = {
  success: "bg-brand-green text-ink-charcoal",
  warning: "bg-brand-yellow text-ink-charcoal",
  danger: "bg-brand-coral text-white",
  info: "bg-brand-sky text-white",
  neutral: "bg-paper-sand text-ink-charcoal",
};

const COLS = {
  // The tracks have to fit the column the table is given (~627px at a 1440px
  // window): 5 gaps of 16 plus 48 of row padding leave ~499 for tracks, and the
  // executor address needs 97 of that. A bare `1fr` floors at min-content, so it
  // forced the row to 765px and overflow-x-auto hid the escrow column; reducing
  // the fixed tracks and flooring the address at minmax(0,1fr) makes the row fit
  // its container instead of scrolling at the most common desktop width.
  jobs: "grid-cols-[56px_112px_minmax(0,1fr)_80px_48px_96px]",
  settled: "grid-cols-[56px_108px_minmax(0,1fr)_76px_60px_92px]",
};

/* ── Presentational pieces, defined once at module scope. Defining them inside
   Dashboard would give each a fresh identity on every render, so React would
   remount them and any focused input would lose focus after one keystroke. ── */

function Field({ id, label, help, children }) {
  return (
    <label className="flex flex-col gap-3" htmlFor={id}>
      <span className="label-caps text-ink-muted">{label}</span>
      {children}
      {help && <span className="text-sm leading-5 text-ink-muted">{help}</span>}
    </label>
  );
}

function Line({ k, children }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-ink-charcoal/10 pb-4 last:border-0 last:pb-0">
      <span className="text-sm text-ink-muted shrink-0 pt-1">{k}</span>
      <span className="text-right text-[15px] leading-7 break-all">{children}</span>
    </div>
  );
}

function Kpi({ value, label, foot, tone = "text-ink-charcoal" }) {
  return (
    <div className="sticker p-8">
      <p className="label-caps text-ink-muted">{label}</p>
      <p className={`mt-4 text-6xl font-extrabold tracking-tight tabular-nums ${tone}`}>{value}</p>
      <p className="mt-3 text-sm leading-5 text-ink-muted">{foot}</p>
    </div>
  );
}

function JobsTable({ rows, cfg, unit, sel, setSel }) {
  return (
    <div className="overflow-x-auto">
      <div className={`pc-head ${COLS.jobs} min-w-[620px]`}>
        <span>Job</span><span>State</span><span>Executor</span>
        <span className="pc-num">Counted</span><span className="pc-num">Left</span><span className="pc-num">Escrow</span>
      </div>
      {rows.map((j) => {
        const tone = STATE_TONE[STATES[j.state]];
        return (
          <div
            key={j.id}
            role="button"
            tabIndex={0}
            onClick={() => setSel(j.id)}
            onKeyDown={(e) => { if (e.key === "Enter") setSel(j.id); }}
            className={`pc-row ${COLS.jobs} min-w-[620px]${sel === j.id ? " selected" : ""}`}
          >
            <span className="font-semibold">#{j.id}</span>
            <span><span className={`${CHIP[tone]} label-caps px-4 py-1.5 rounded-full`}>{STATES[j.state]}</span></span>
            <a
              className="pc-addr hover:text-brand-green-dark transition-colors"
              href={`${cfg?.explorerUrl}/address/${j.executor}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="open this executor on the explorer"
            >{shortAddr(j.executor)} ↗</a>
            <span className="pc-num">{j.executorUnits + j.takerUnits} / {j.totalUnits}</span>
            <span className="pc-num">{j.totalUnits - j.executorUnits - j.takerUnits}</span>
            <span className="pc-num">{asNum(j.escrow, 6)} {unit}</span>
          </div>
        );
      })}
    </div>
  );
}

function Detail({ selected, me, cfg, unit, units, now, busy, run, pushTx, unitInput, setUnitInput, listMinutes, setListMinutes }) {
  if (!selected) {
    return (
      <div className="sticker p-10 min-w-0">
        <p className="text-lg leading-8 text-ink-muted">
          Pick a row and this panel shows the obligation, the units counted so far, and the actions your wallet is
          allowed to take on it.
        </p>
      </div>
    );
  }
  const j = selected;
  const remaining = j.totalUnits - j.executorUnits - j.takerUnits;
  const isExecutor = me && j.executor.toLowerCase() === me;
  const isTaker = me && j.taker.toLowerCase() === me;
  const isBuyer = me && j.buyer.toLowerCase() === me;
  const bondReq = (BigInt(remaining) * j.pricePerUnit) / 2n;
  const roles = [];
  if (isBuyer) roles.push("buyer");
  if (isExecutor) roles.push("executor");
  if (isTaker) roles.push("taker");
  /* the lowest index nobody has counted — counting an occupied one is refused on chain */
  const firstFree = units.find((u) => !u.hash)?.index;
  const tone = STATE_TONE[STATES[j.state]];

  const countUnit = () => {
    const idx = idxInt(unitInput);
    if (idx == null) {
      pushTx({ kind: "fail", label: "Not a unit index", detail: "A unit index is a whole number, zero or greater. Nothing was sent to the chain." });
      return;
    }
    run(`count unit ${idx}`, `Count unit ${idx}`, async () =>
      (await signerOf(cfg)).countUnit(j.id, BigInt(idx), keccak256(toUtf8Bytes(`receipt:${j.id}:${idx}:${Date.now()}`))));
  };

  const listMin = posNum(listMinutes);

  return (
    <div className="sticker p-8 sm:p-10 min-w-0">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-3xl font-semibold tracking-tight">Job #{j.id}</h2>
        <span className={`${CHIP[tone]} label-caps px-4 py-1.5 rounded-full`}>{STATES[j.state]}</span>
      </div>

      <div className="mt-8 space-y-4">
        <Line k="Buyer"><span className="pc-addr">{j.buyer}</span></Line>
        <Line k="Executor"><span className="pc-addr">{j.executor}</span></Line>
        <Line k="Escrow">{asNum(j.escrow, 6)} {unit} · {j.totalUnits} units at {asNum(j.pricePerUnit, 6)}</Line>
        <Line k="Counted">{j.executorUnits} executor · {j.takerUnits} taker · {remaining} left</Line>
        <Line k="Deadline">
          {new Date(j.workDeadline * 1000).toLocaleString()}
          {now > j.workDeadline && <span className="ml-3 bg-brand-yellow label-caps px-3 py-1 rounded-full">passed</span>}
        </Line>
        {j.taker !== ZERO && <Line k="Taker"><span className="pc-addr">{j.taker}</span></Line>}
        {j.bond > 0n && <Line k="Taker bond">{asNum(j.bond, 6)} {unit}</Line>}
        {j.state === 3 && (
          <Line k="Taker deadline">
            {new Date(j.takerDeadline * 1000).toLocaleString()}
            {now > j.takerDeadline && <span className="ml-3 bg-brand-yellow label-caps px-3 py-1 rounded-full">passed</span>}
          </Line>
        )}
        <Line k="Your role">{roles.length ? roles.join(" + ") : "none yet — you may take this over if it is listed"}</Line>
        <Line k="On chain">
          <a className="underline decoration-brand-coral decoration-2 underline-offset-4" href={`${cfg?.explorerUrl}/address/${cfg?.venue}`} target="_blank" rel="noreferrer">
            view the contract ↗
          </a>
        </Line>
        <Line k="Receipts">
          {units.length === 0 ? (
            <span className="text-ink-muted">reading unitReceipt({j.id}, …) from the contract…</span>
          ) : (
            <div className="flex flex-wrap gap-2">
              {units.map((u) =>
                u.hash ? (
                  <span key={u.index} className="pc-num bg-brand-sky text-white rounded-full px-3 py-1" title={u.hash}>
                    #{u.index} · {u.hash.slice(0, 10)}…
                  </span>
                ) : (
                  <span key={u.index} className="pc-num bg-paper-sand text-ink-charcoal rounded-full px-3 py-1">
                    #{u.index} free
                  </span>
                ),
              )}
            </div>
          )}
        </Line>
      </div>

      <p className="mt-6 text-base leading-7 text-ink-muted">
        Each counted unit stores its receipt hash on chain at <span className="pc-num">unitReceipt({j.id}, index)</span>, and a
        unit index can never be written twice — so a free index is one nobody has counted, and the same index cannot be counted again.
      </p>

      {j.state === 4 && (
        <p className="mt-8 text-base leading-7 text-ink-muted">
          {j.takerUnits > 0
            ? `Settled: the executor was paid for ${j.executorUnits} units, and the taker for ${j.takerUnits} plus the bond back.`
            : `Settled: the executor counted all ${j.executorUnits} units and was paid for every one. No takeover was needed.`}
        </p>
      )}
      {j.state === 5 && (
        <p className="mt-8 text-base leading-7 text-ink-muted">
          Closed by rule: the bond went to the buyer, and each party kept pay for what it counted.
        </p>
      )}

      {((j.state === 0 && isExecutor) || (j.state === 3 && isTaker)) && (
        <div className="mt-8 pt-8 border-t border-ink-charcoal/10">
          <Field id="unit" label="Count a finished unit" help="The receipt is hashed in your browser and stored per index. A repeat at the same index is refused on chain, so the free index below is the one to use.">
            <input id="unit" className="pc-input" placeholder={firstFree != null ? `unit index, e.g. ${firstFree}` : "every unit is already counted"} value={unitInput} onChange={(e) => setUnitInput(e.target.value)} />
          </Field>
          <div className="mt-6">
            <button className="pc-pill primary" disabled={!!busy || unitInput === ""} onClick={countUnit}>
              Count unit {idxInt(unitInput) ?? unitInput}
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 pt-8 border-t border-ink-charcoal/10 flex flex-wrap items-center gap-4">
        {j.state === 0 && isExecutor && (
          <button className="pc-pill ghost" disabled={!!busy} onClick={() => run(`stall ${j.id}`, `Declare stall on job ${j.id}`, async () => (await signerOf(cfg)).declareStalled(j.id))}>
            I am stopping
          </button>
        )}
        {j.state === 0 && !isExecutor && now > j.workDeadline && (
          <button className="pc-pill ghost" disabled={!!busy} onClick={() => run(`stall ${j.id}`, `Declare stall on job ${j.id}`, async () => (await signerOf(cfg)).declareStalled(j.id))}>
            Deadline passed — declare stall
          </button>
        )}
        {j.state === 1 && (
          <>
            <input className="pc-input small w-[130px]" value={listMinutes} onChange={(e) => setListMinutes(e.target.value)} aria-label="listing window in minutes" />
            <button className="pc-pill primary" disabled={!!busy || listMin == null} onClick={() => run(`list ${j.id}`, `List job ${j.id} for takeover`, async () => (await signerOf(cfg)).listObligation(j.id, BigInt(Math.floor(now + listMin * 60))))}>
              List for takeover · {listMin ?? "?"} min
            </button>
          </>
        )}
        {j.state === 2 && (
          <button className="pc-pill primary" disabled={!!busy} onClick={() => run(`take ${j.id}`, `Take over ${remaining} units of job ${j.id}`, async () => (await signerOf(cfg)).takeObligation(j.id, { value: bondReq }))}>
            Take over {remaining} units · bond {asNum(bondReq, 6)} {unit}
          </button>
        )}
        {j.state === 3 && now > j.takerDeadline && remaining > 0 && (
          <button className="pc-pill ghost" disabled={!!busy} onClick={() => run(`close ${j.id}`, `Close job ${j.id} by rule`, async () => (await signerOf(cfg)).closeFailed(j.id))}>
            Taker missed the deadline — close by rule
          </button>
        )}
        {!isBuyer && !isExecutor && !isTaker && j.state !== 2 && j.state !== 4 && j.state !== 5 && (
          <p className="text-base leading-7 text-ink-muted">No action is open to this wallet on this obligation right now.</p>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const v = useVenue();
  const { cfg, cfgError, account, chainOk, jobs, credits, stats, loading, readError, lastReadAt, now, busy, run, pushTx } = v;
  const [view, setView] = useState("overview");
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(null);
  const [unitInput, setUnitInput] = useState("");
  const [listMinutes, setListMinutes] = useState("60");
  const [form, setForm] = useState({ executor: "", units: "10", price: "0.001", hours: "24" });

  useEffect(() => { if (sel == null && jobs.length) setSel(jobs[0].id); }, [jobs, sel]);
  useEffect(() => { setUnitInput(""); }, [sel]);
  useEffect(() => {
    document.body.classList.add("spectral-body");
    return () => document.body.classList.remove("spectral-body");
  }, []);

  const me = account?.toLowerCase();
  const unit = cfg?.nativeSymbol || "";
  const selected = useMemo(() => jobs.find((j) => j.id === sel) || null, [jobs, sel]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => [j.id, STATES[j.state], j.executor, j.buyer, j.taker].join(" ").toLowerCase().includes(q));
  }, [jobs, query]);

  /* The receipts for the open obligation, read from the contract. Kept at this level
     rather than inside Detail because Detail returns early when nothing is selected,
     and a hook below that early return would run conditionally. */
  const [units, setUnits] = useState([]);
  useEffect(() => {
    if (!cfg || !selected) { setUnits([]); return undefined; }
    let live = true;
    setUnits([]);
    readReceipts(cfg, selected)
      .then((u) => { if (live) setUnits(u); })
      .catch(() => { if (live) setUnits([]); });
    return () => { live = false; };
  }, [cfg, selected?.id, selected?.executorUnits, selected?.takerUnits]);

  if (cfgError) {
    return (
      <div className="spectral-app flex items-center justify-center p-8">
        <div className="sticker max-w-2xl p-10">
          <h1 className="text-2xl font-semibold tracking-tight">Refusing to run without chain configuration</h1>
          <p className="mt-4 text-base text-ink-muted">{cfgError}</p>
        </div>
      </div>
    );
  }

  const openJob = () => {
    const unitsN = posInt(form.units);
    const priceN = posNum(form.price);
    const hoursN = posNum(form.hours);
    if (unitsN == null) { pushTx({ kind: "fail", label: "Units must be a whole number above zero", detail: "Nothing was sent to the chain." }); return; }
    if (priceN == null) { pushTx({ kind: "fail", label: "Price per unit must be a number above zero", detail: "Nothing was sent to the chain." }); return; }
    if (hoursN == null) { pushTx({ kind: "fail", label: "Work deadline must be a number of hours above zero", detail: "Nothing was sent to the chain." }); return; }
    let ppu;
    try { ppu = parseEther(String(form.price)); }
    catch { pushTx({ kind: "fail", label: `Could not read "${form.price}" as ${unit}`, detail: "Use a plain decimal like 0.001. Nothing was sent to the chain." }); return; }
    const unitsBig = BigInt(unitsN);
    const deadline = BigInt(Math.floor(now + hoursN * 3600));
    run("create", `Escrow ${unitsN} units`, async () =>
      (await signerOf(cfg)).createJob(form.executor, unitsBig, ppu, deadline, { value: unitsBig * ppu }))
      .then((ok) => { if (ok) { setSel(null); setView("obligations"); } });
  };

  const escrowPreview = (() => {
    const u = posInt(form.units), p = posNum(form.price);
    if (u == null || p == null) return "enter whole units and a positive price";
    return `${form.units} × ${form.price} = ${(u * p).toFixed(6)} ${unit}`;
  })();

  const titles = { overview: "Overview", obligations: "Obligations", open: "Open a job", settlement: "Settlement" };

  return (
    <div className="spectral-app">
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8 py-6 lg:py-8">
        <div className="grid lg:grid-cols-[264px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
          {/* sidebar */}
          <aside className="pc-side min-w-0">
            <a
              href="/"
              title="Back to the landing page"
              className="flex items-center justify-between gap-3 px-4 h-12 rounded-full hover:bg-paper-cream transition-colors group"
            >
              <span className="text-xl font-bold tracking-tight group-hover:text-brand-green-dark transition-colors">Spectral</span>
              <span className="label-caps text-ink-muted group-hover:text-ink-charcoal transition-colors">landing ↗</span>
            </a>

            <div className="pc-search mt-6">
              <span aria-hidden="true">⌕</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter obligations" aria-label="Filter obligations" />
            </div>

            <nav className="mt-8 flex flex-col gap-1">
              <button className="pc-navitem" aria-current={view === "overview" ? "page" : undefined} onClick={() => setView("overview")}>
                <span>Overview</span><span className="count">{jobs.length}</span>
              </button>
              <button className="pc-navitem" aria-current={view === "obligations" ? "page" : undefined} onClick={() => setView("obligations")}>
                <span>Obligations</span><span className="count">{stats.live}</span>
              </button>
              <button className="pc-navitem" aria-current={view === "open" ? "page" : undefined} onClick={() => setView("open")}>
                <span>Open a job</span>
              </button>
              <button className="pc-navitem" aria-current={view === "settlement" ? "page" : undefined} onClick={() => setView("settlement")}>
                <span>Settlement</span><span className="count">{stats.settled + stats.closed}</span>
              </button>
            </nav>

            {credits > 0n && (
              <div className="mt-8">
                <button className="pc-pill ink w-full" disabled={!!busy} onClick={() => run("claim", `Claim ${asNum(credits)} ${unit}`, async () => (await signerOf(cfg)).claim())}>
                  Claim {asNum(credits)} {unit}
                </button>
              </div>
            )}
          </aside>

          {/* content */}
          <main className="min-w-0 flex flex-col gap-8 lg:gap-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-ink-muted">
                <span className="font-semibold text-ink-charcoal">{titles[view]}</span>
                <span aria-hidden="true">·</span>
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${chainOk === false ? "bg-brand-coral" : "bg-brand-green-dark"}`} />
                  updated {ago(lastReadAt)}
                </span>
              </div>
              {!account
                ? (
                  <div className="flex flex-col items-end gap-1">
                    <button className="pc-pill primary" onClick={v.connect}>Connect {v.wallet || "wallet"}</button>
                    <span className="text-xs text-ink-muted">Reading needs no wallet — connecting is only for signing.</span>
                  </div>
                )
                : (
                  <button className="pc-pill ghost" onClick={v.ensureChain} title="Switch the wallet to the venue chain">
                    <span className="font-mono text-xs">{shortAddr(account)}</span>
                    {chainOk === false
                      ? <span className="bg-brand-coral text-white label-caps px-3 py-1 rounded-full">switch network</span>
                      : <span className="bg-brand-green label-caps px-3 py-1 rounded-full">connected</span>}
                  </button>
                )}
            </div>

            {readError && (
              <div className="sticker p-8 border-l-[10px] border-brand-coral">
                <p className="text-xl font-semibold">Could not read the venue</p>
                <p className="mt-3 text-base leading-7 text-ink-muted break-all">{readError}</p>
                <button className="pc-pill ghost mt-6" onClick={() => v.load()}>Try again</button>
              </div>
            )}

            {view === "overview" && (
              <>
                <section className="flex flex-wrap items-end justify-between gap-6">
                  <div>
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">The obligations, as they stand</h1>
                    <p className="mt-4 max-w-[60ch] text-lg leading-7 text-ink-muted">
                      Every number here is read from the contract when this page loads. Open a job, count a unit,
                      stop, or take over what someone else left behind.
                    </p>
                  </div>
                  <button className="pc-pill primary" onClick={() => setView("open")}>Open a job</button>
                </section>

                <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
                  <Kpi value={stats.counted} label="Units counted" foot={`of ${stats.units} registered across every job`} />
                  <Kpi value={stats.live} label="Obligations live" foot={`${stats.open} open · ${stats.listed} listed for takeover`} />
                  <Kpi value={asNum(stats.locked)} label={`${unit} still escrowed`} foot="held by the contract, not by us" />
                  <Kpi value={asNum(credits)} label="Your claimable" foot={account ? `${unit} for ${shortAddr(account)}` : "connect a wallet to see yours"} />
                </section>

                <section className="grid xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-6 lg:gap-8 items-start min-w-0">
                  <div className="sticker pb-4 min-w-0">
                    <div className="flex items-center justify-between gap-4 p-8 pb-4">
                      <h2 className="text-2xl font-semibold tracking-tight">Obligations</h2>
                      <span className="text-sm text-ink-muted">{filtered.length} of {jobs.length}</span>
                    </div>
                    {loading ? (
                      <div className="px-8 pb-8 space-y-4">
                        <div className="h-14 rounded-full bg-paper-cream" />
                        <div className="h-14 rounded-full bg-paper-cream" />
                      </div>
                    ) : jobs.length === 0 ? (
                      <div className="px-8 pb-12 text-center">
                        <p className="text-2xl font-semibold tracking-tight">No obligation has been opened yet</p>
                        <p className="mt-3 text-base leading-7 text-ink-muted">
                          Opening one escrows units × price against a named executor and a deadline.
                        </p>
                        <button className="pc-pill primary mt-6" onClick={() => setView("open")}>Open the first job</button>
                      </div>
                    ) : (
                      <JobsTable rows={filtered} cfg={cfg} unit={unit} sel={sel} setSel={setSel} />
                    )}
                  </div>
                  <Detail
                    selected={selected} me={me} cfg={cfg} unit={unit} units={units} now={now} busy={busy} run={run} pushTx={pushTx}
                    unitInput={unitInput} setUnitInput={setUnitInput} listMinutes={listMinutes} setListMinutes={setListMinutes}
                  />
                </section>
              </>
            )}

            {view === "obligations" && (
              <>
                <section>
                  <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Every obligation</h1>
                  <p className="mt-4 text-lg leading-7 text-ink-muted">Newest first. Pick one to act on it.</p>
                </section>
                {loading ? (
                  <div className="sticker p-8 h-48" />
                ) : filtered.length === 0 ? (
                  <div className="sticker p-12 text-center">
                    <p className="text-2xl font-semibold tracking-tight">{query ? "Nothing matches that filter" : "No obligations yet"}</p>
                    <p className="mt-3 text-base text-ink-muted">
                      {query ? "Clear the filter in the sidebar to see every job." : "Open one, and the chain starts counting."}
                    </p>
                  </div>
                ) : (
                  <div className="sticker pb-4 min-w-0"><JobsTable rows={filtered} cfg={cfg} unit={unit} sel={sel} setSel={setSel} /></div>
                )}
                {selected && (
                  <Detail
                    selected={selected} me={me} cfg={cfg} unit={unit} units={units} now={now} busy={busy} run={run} pushTx={pushTx}
                    unitInput={unitInput} setUnitInput={setUnitInput} listMinutes={listMinutes} setListMinutes={setListMinutes}
                  />
                )}
              </>
            )}

            {view === "open" && (
              <>
                <section>
                  <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Open a job</h1>
                  <p className="mt-4 max-w-[60ch] text-lg leading-7 text-ink-muted">
                    You escrow units × price exactly. The contract refuses any other amount, so no rounding dust
                    can exist anywhere in the system.
                  </p>
                </section>

                {!account ? (
                  <div className="sticker p-12 text-center">
                    <p className="text-2xl font-semibold tracking-tight">Connect a wallet to escrow</p>
                    <p className="mt-3 text-base text-ink-muted">Reading never needs a wallet. Signing does — OKX Wallet is used first when it is installed.</p>
                    <button className="pc-pill primary mt-6" onClick={v.connect}>Connect {v.wallet || "wallet"}</button>
                  </div>
                ) : (
                  <div className="sticker p-8 sm:p-10 max-w-[880px]">
                    <div className="grid sm:grid-cols-2 gap-8">
                      <div className="sm:col-span-2">
                        <Field id="exec" label="Executor address" help="The party expected to count the units. Name your own address to run the whole lifecycle from this one wallet: count, stop, list, take over, finish or fail.">
                          <input id="exec" className="pc-input" placeholder="0x…" value={form.executor} onChange={(e) => setForm({ ...form, executor: e.target.value })} />
                        </Field>
                        {account && (
                          <button
                            type="button"
                            className="label-pill mt-3 underline decoration-brand-green decoration-2 underline-offset-4"
                            onClick={() => setForm({ ...form, executor: account })}
                          >
                            Use my address as the executor
                          </button>
                        )}
                      </div>
                      <Field id="units" label="Units">
                        <input id="units" className="pc-input" type="number" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} />
                      </Field>
                      <Field id="price" label={`Price per unit (${unit})`}>
                        <input id="price" className="pc-input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                      </Field>
                      <Field id="hours" label="Work deadline (hours from now)">
                        <input id="hours" className="pc-input" type="number" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
                      </Field>
                      <Field id="escrow" label="Escrow required">
                        <input id="escrow" className="pc-input" readOnly value={escrowPreview} />
                      </Field>
                      <div className="sm:col-span-2 -mt-2">
                        <a className="label-pill underline decoration-brand-green decoration-2 underline-offset-4" href={cfg?.faucetUrl} target="_blank" rel="noreferrer">
                          Get testnet {unit} from the faucet ↗
                        </a>
                        <span className="ml-3 text-sm text-ink-muted">gas and escrow both come from the same testnet balance</span>
                      </div>
                    </div>

                    <div className="mt-10 flex flex-wrap items-center gap-5">
                      <button className="pc-pill primary" disabled={!!busy || !form.executor || !chainOk} onClick={openJob}>
                        Escrow {form.units} × {form.price} {unit}
                      </button>
                      <span className="text-sm leading-5 text-ink-muted max-w-[36ch]">
                        {chainOk ? "Your own wallet signs the transaction." : `Switch your wallet to ${cfg?.chainName} first.`}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {view === "settlement" && (
              <>
                <section>
                  <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Settlement</h1>
                  <p className="mt-4 max-w-[60ch] text-lg leading-7 text-ink-muted">
                    How a job ends, and what the contract did with each one so far.
                  </p>
                </section>

                <section className="grid md:grid-cols-3 gap-6">
                  {[
                    { n: "01", tone: "bg-brand-green text-ink-charcoal", t: "The units are escrowed", b: "Escrow equals units × price exactly. No rounding, no dust, nothing to sweep." },
                    { n: "02", tone: "bg-brand-coral text-white", t: "The executor stops", b: "Counted units stay with whoever counted them. The remainder is listed, not refunded." },
                    { n: "03", tone: "bg-brand-yellow text-ink-charcoal", t: "A taker finishes it", b: "Bond at least half the remaining escrow. Miss the deadline and the bond goes to the buyer." },
                  ].map((s) => (
                    <article key={s.n} className="sticker p-8">
                      <span className={`${s.tone} w-12 h-12 rounded-full grid place-items-center font-semibold`}>{s.n}</span>
                      <h2 className="mt-6 text-2xl font-semibold tracking-tight">{s.t}</h2>
                      <p className="mt-3 text-base leading-7 text-ink-muted">{s.b}</p>
                    </article>
                  ))}
                </section>

                {jobs.filter((j) => j.state === 4 || j.state === 5).length === 0 ? (
                  <div className="sticker p-12 text-center">
                    <p className="text-2xl font-semibold tracking-tight">Nothing has settled yet</p>
                    <p className="mt-3 text-base leading-7 text-ink-muted">
                      A job settles when every unit is counted, or closes by rule when a taker misses the deadline.
                    </p>
                  </div>
                ) : (
                  <div className="sticker pb-4 min-w-0">
                    <div className={`pc-head ${COLS.settled} min-w-[620px]`}>
                      <span>Job</span><span>Outcome</span><span>Path</span>
                      <span className="pc-num">Executor</span><span className="pc-num">Taker</span><span className="pc-num">Bond</span>
                    </div>
                    {jobs.filter((j) => j.state === 4 || j.state === 5).map((j) => {
                      const tone = STATE_TONE[STATES[j.state]];
                      return (
                        <div key={j.id} className={`pc-row ${COLS.settled} min-w-[620px] cursor-default`}>
                          <span className="font-semibold">#{j.id}</span>
                          <span><span className={`${CHIP[tone]} label-caps px-4 py-1.5 rounded-full`}>{STATES[j.state]}</span></span>
                          <span className="text-sm text-ink-muted">{j.state === 4 ? "every unit counted" : j.taker !== ZERO ? "taker missed the deadline" : "deadline passed, no taker"}</span>
                          <span className="pc-num">{j.executorUnits} units</span>
                          <span className="pc-num">{j.takerUnits} units</span>
                          <span className="pc-num">{j.bond > 0n ? asNum(j.bond, 6) : "—"}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className="text-base leading-7 text-ink-muted">
                  Executor pay is counted units × price per unit, read from the contract — {asNum(stats.locked)} {unit} is still locked in live jobs.
                </p>
              </>
            )}
          </main>
        </div>
      </div>

      <Toasts txs={v.txs} dismissTx={v.dismissTx} cfg={cfg} />
    </div>
  );
}

/* the signer is built from the wallet only when a write actually happens.
 * `injected()` prefers OKX Wallet (window.okxwallet) when it is installed and falls back
 * to any other EIP-1193 provider; reads never come through here. */
async function signerOf(cfg) {
  const { BrowserProvider, Contract } = await import("ethers");
  const abi = (await import("../lib/abi.json")).default;
  const { injected } = await import("../lib/wallet.js");
  const p = injected();
  if (!p) throw new Error("no EIP-1193 wallet in this browser");
  return new Contract(cfg.venue, abi, await new BrowserProvider(p).getSigner());
}
