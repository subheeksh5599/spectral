import React, { useMemo, useState, useEffect } from "react";
import { parseEther, keccak256, toUtf8Bytes } from "ethers";
import { useVenue, STATES, STATE_TONE, ZERO, shortAddr, asNum } from "./venue.js";
import Toasts from "./Toasts.jsx";

const ago = (ms) => {
  if (!ms) return "–";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)} min ago`;
};

export default function Dashboard() {
  const v = useVenue();
  const { cfg, cfgError, account, chainOk, jobs, credits, stats, loading, readError, lastReadAt, now, busy, run } = v;
  const [view, setView] = useState("overview");
  const [query, setQuery] = useState("");
  const [sel, setSel] = useState(null);
  const [unitInput, setUnitInput] = useState("");
  const [listMinutes, setListMinutes] = useState("60");
  const [form, setForm] = useState({ executor: "", units: "10", price: "0.001", hours: "24" });

  useEffect(() => { if (sel == null && jobs.length) setSel(jobs[0].id); }, [jobs, sel]);
  useEffect(() => { setUnitInput(""); }, [sel]);

  const me = account?.toLowerCase();
  const unit = cfg?.nativeSymbol || "";
  const selected = useMemo(() => jobs.find((j) => j.id === sel) || null, [jobs, sel]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => [j.id, STATES[j.state], j.executor, j.buyer, j.taker].join(" ").toLowerCase().includes(q));
  }, [jobs, query]);

  if (cfgError) {
    return <div className="content"><div className="alert danger"><b>Refusing to run without chain configuration.</b> {cfgError}</div></div>;
  }

  const roleOf = (j) => {
    const r = [];
    if (me && j.buyer.toLowerCase() === me) r.push("buyer");
    if (me && j.executor.toLowerCase() === me) r.push("executor");
    if (me && j.taker.toLowerCase() === me) r.push("taker");
    return r;
  };

  const JobDetail = () => {
    if (!selected) return (
      <div className="card pad">
        <p className="subtle body-sm">Select a row to see the obligation, the counted units and the actions your wallet is allowed to take.</p>
      </div>
    );
    const j = selected;
    const remaining = j.totalUnits - j.executorUnits - j.takerUnits;
    const isExecutor = me && j.executor.toLowerCase() === me;
    const isTaker = me && j.taker.toLowerCase() === me;
    const isBuyer = me && j.buyer.toLowerCase() === me;
    const bondReq = (BigInt(remaining) * j.pricePerUnit) / 2n;
    const roles = roleOf(j);

    return (
      <div className="card pad">
        <div className="panel-title">
          <h3 className="title-sm">Job #{j.id}</h3>
          <span className={`badge ${STATE_TONE[STATES[j.state]]}`}>
            <span className={`dot ${STATE_TONE[STATES[j.state]]}`} />{STATES[j.state]}
          </span>
        </div>

        <div className="kv-grid" style={{ marginBottom: 16 }}>
          <div className="k">Buyer</div><div className="addr mono">{j.buyer}</div>
          <div className="k">Executor</div><div className="addr mono">{j.executor}</div>
          <div className="k">Escrow</div><div className="tnum">{asNum(j.escrow, 6)} {unit} · {j.totalUnits} units at {asNum(j.pricePerUnit, 6)}</div>
          <div className="k">Counted</div><div className="tnum">{j.executorUnits} executor · {j.takerUnits} taker · {remaining} left</div>
          <div className="k">Work deadline</div><div>{new Date(j.workDeadline * 1000).toLocaleString()}{now > j.workDeadline && <span className="badge warning" style={{ marginLeft: 8 }}><span className="dot warning" />passed</span>}</div>
          {j.taker !== ZERO && <><div className="k">Taker</div><div className="addr mono">{j.taker}</div></>}
          {j.bond > 0n && <><div className="k">Taker bond</div><div className="tnum">{asNum(j.bond, 6)} {unit}</div></>}
          {j.state === 3 && <><div className="k">Taker deadline</div><div>{new Date(j.takerDeadline * 1000).toLocaleString()}{now > j.takerDeadline && <span className="badge warning" style={{ marginLeft: 8 }}><span className="dot warning" />passed</span>}</div></>}
          <div className="k">Your role</div><div>{roles.length ? roles.join(" + ") : "none — you may take this over if it is listed"}</div>
        </div>

        {j.state === 4 && <p className="body-sm subtle" style={{ marginBottom: 12 }}>Settled: the executor was paid for {j.executorUnits} units, the taker for {j.takerUnits} plus the bond.</p>}
        {j.state === 5 && <p className="body-sm subtle" style={{ marginBottom: 12 }}>Closed by rule: the bond went to the buyer, and each party kept pay for what it counted.</p>}

        {((j.state === 0 && isExecutor) || (j.state === 3 && isTaker)) && (
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="unit">Count a finished unit</label>
            <input id="unit" placeholder="unit index, e.g. 7" value={unitInput} onChange={(e) => setUnitInput(e.target.value)} />
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button className="btn" disabled={!!busy || unitInput === ""} onClick={() => run(`count unit ${unitInput}`, `Count unit ${unitInput}`, async () =>
                (await signerOf(cfg, v)).countUnit(j.id, BigInt(unitInput), keccak256(toUtf8Bytes(`receipt:${j.id}:${unitInput}:${Date.now()}`))))}>
                {busy === `count unit ${unitInput}` && <span className="spin" />}Count unit
              </button>
            </div>
            <p className="help">The receipt is hashed in your browser and stored per index. A second attempt at the same index is refused on chain.</p>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {j.state === 0 && isExecutor && (
            <button className="btn secondary" disabled={!!busy} onClick={() => run(`stall ${j.id}`, `Declare stall on job ${j.id}`, async () => (await signerOf(cfg, v)).declareStalled(j.id))}>I am stopping</button>)}
          {j.state === 0 && !isExecutor && now > j.workDeadline && (
            <button className="btn secondary" disabled={!!busy} onClick={() => run(`stall ${j.id}`, `Declare stall on job ${j.id}`, async () => (await signerOf(cfg, v)).declareStalled(j.id))}>Deadline passed — declare stall</button>)}
          {j.state === 1 && (<>
            <input style={{ width: 80 }} value={listMinutes} onChange={(e) => setListMinutes(e.target.value)} aria-label="listing window in minutes" />
            <button className="btn" disabled={!!busy} onClick={() => run(`list ${j.id}`, `List job ${j.id} for takeover`, async () => (await signerOf(cfg, v)).listObligation(j.id, BigInt(now + Number(listMinutes) * 60)))}>List for takeover · {listMinutes} min</button></>)}
          {j.state === 2 && (
            <button className="btn" disabled={!!busy} onClick={() => run(`take ${j.id}`, `Take over ${remaining} units of job ${j.id}`, async () => (await signerOf(cfg, v)).takeObligation(j.id, { value: bondReq }))}>Take over {remaining} units · bond {asNum(bondReq, 6)} {unit}</button>)}
          {j.state === 3 && now > j.takerDeadline && remaining > 0 && (
            <button className="btn secondary" disabled={!!busy} onClick={() => run(`close ${j.id}`, `Close job ${j.id} by rule`, async () => (await signerOf(cfg, v)).closeFailed(j.id))}>Taker missed the deadline — close by rule</button>)}
          {!isBuyer && !isExecutor && !isTaker && j.state !== 2 && j.state !== 4 && j.state !== 5 && (
            <p className="body-sm subtle">No action is available to this wallet on this obligation right now.</p>)}
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="ws">
          <span className="mark">ob</span>
          <span className="hide-sm title-sm">Obligo</span>
        </div>
        <div className="search">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter obligations" aria-label="Filter obligations" />
          <span className="kbd hide-sm">⌘K</span>
        </div>
        <div className="navlabel">Navigation</div>
        <button className="navitem" aria-current={view === "overview" ? "page" : undefined} onClick={() => setView("overview")}>
          <span>Overview</span><span className="count">{jobs.length}</span>
        </button>
        <button className="navitem" aria-current={view === "obligations" ? "page" : undefined} onClick={() => setView("obligations")}>
          <span>Obligations</span><span className="count">{stats.live}</span>
        </button>
        <button className="navitem" aria-current={view === "open" ? "page" : undefined} onClick={() => setView("open")}>
          <span>Open a job</span>
        </button>
        <button className="navitem" aria-current={view === "settlement" ? "page" : undefined} onClick={() => setView("settlement")}>
          <span>Settlement</span><span className="count">{stats.settled + stats.closed}</span>
        </button>
        <div className="side-foot">
          <div className="fresh">
            <span className={`statusdot ${chainOk === false ? "warn" : ""}`} />
            <span className="hide-sm">{chainOk === false ? "wrong network" : "read OK"}</span>
          </div>
          {credits > 0n && (
            <button className="btn inverse wide" disabled={!!busy} onClick={() => run("claim", `Claim ${asNum(credits)} ${unit}`, async () => (await signerOf(cfg, v)).claim())}>Claim {asNum(credits)} {unit}</button>)}
          <a className="btn secondary wide" href="/">Landing page</a>
        </div>
      </aside>

      <main>
        <div className="topbar">
          <div className="crumb">Obligo <span>/</span> <b>{view === "overview" ? "Overview" : view === "open" ? "Open a job" : view === "obligations" ? "Obligations" : "Settlement"}</b></div>
          <span className="spacer" />
          <span className="fresh hide-sm">
            <span className={`statusdot ${chainOk === false ? "warn" : ""}`} />
            updated {ago(lastReadAt)}
          </span>
          {cfg && <span className="badge neutral hide-sm"><span className="dot neutral" />{cfg.chainName} · {cfg.chainId}</span>}
          {!account
            ? <button className="btn" onClick={v.connect}>Connect wallet</button>
            : <button className="wallet" onClick={v.ensureChain} title="Switch to the venue chain">
                <span className="avatar">{account.slice(2, 3).toUpperCase()}</span>
                <span className="mono">{shortAddr(account)}</span>
                {chainOk === false && <span className="badge danger"><span className="dot danger" />switch</span>}
              </button>}
        </div>

        <div className="content">
          {readError && (
            <div className="alert danger" style={{ marginBottom: 16 }}>
              <b>Could not read the venue.</b> {readError}
              <button className="btn sm secondary" onClick={() => v.load()}>Retry</button>
            </div>
          )}

          {view === "overview" && (
            <>
              <div className="page-head">
                <div>
                  <h2 className="title">Overview</h2>
                  <p>Unfinished obligations on {shortAddr(cfg?.venue)} — read from the chain, no wallet needed to look.</p>
                </div>
                <button className="btn" onClick={() => setView("open")}>Open a job</button>
              </div>

              <div className="kpi-grid">
                <div className="stat-card">
                  <div className="body">
                    <div className="icon">U</div>
                    <div className="label subtle">Units counted</div>
                    <div className="numeric">{stats.counted}</div>
                  </div>
                  <div className="foot">{stats.units - stats.counted} units never counted</div>
                </div>
                <div className="stat-card">
                  <div className="body">
                    <div className="icon">O</div>
                    <div className="label subtle">Obligations live</div>
                    <div className="numeric">{stats.live}</div>
                  </div>
                  <div className="foot">{stats.open} open · {stats.listed} listed for takeover</div>
                </div>
                <div className="stat-card">
                  <div className="body">
                    <div className="icon">E</div>
                    <div className="label subtle">Escrow still locked</div>
                    <div className="numeric">{asNum(stats.locked)}</div>
                  </div>
                  <div className="foot">{unit} held by the contract</div>
                </div>
                <div className="stat-card">
                  <div className="body">
                    <div className="icon">Y</div>
                    <div className="label subtle">Your claimable</div>
                    <div className="numeric">{asNum(credits)}</div>
                  </div>
                  <div className="foot">{account ? `${unit} for ${shortAddr(account)}` : "connect a wallet to see yours"}</div>
                </div>
              </div>

              <div className="split">
                <div>
                  <div className="panel-title">
                    <h3 className="title-sm">Obligations</h3>
                    <span className="caption">{filtered.length} of {jobs.length}</span>
                  </div>
                  {loading ? (
                    <div className="rows"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
                  ) : jobs.length === 0 ? (
                    <div className="empty">
                      <div className="tile">◻</div>
                      <h3>No obligation has been opened yet</h3>
                      <p>Opening one escrows units × price against a named executor and a deadline.</p>
                      <button className="btn lg" onClick={() => setView("open")}>Open the first job</button>
                    </div>
                  ) : (
                    <JobsTable jobs={filtered} unit={unit} sel={sel} setSel={setSel} />
                  )}
                </div>
                <div>
                  <div className="panel-title"><h3 className="title-sm">Selected obligation</h3></div>
                  <JobDetail />
                </div>
              </div>
            </>
          )}

          {view === "obligations" && (
            <>
              <div className="page-head">
                <div>
                  <h2 className="title">Obligations</h2>
                  <p>Every job on the contract, newest first. Select one to act on it.</p>
                </div>
                <span className="fresh"><span className={`statusdot ${chainOk === false ? "warn" : ""}`} />updated {ago(lastReadAt)}</span>
              </div>
              {loading ? (
                <div className="rows"><div className="skeleton" /><div className="skeleton" /></div>
              ) : filtered.length === 0 ? (
                <div className="empty">
                  <div className="tile">◻</div>
                  <h3>{query ? "Nothing matches that filter" : "No obligations yet"}</h3>
                  <p>{query ? "Clear the filter in the sidebar to see every job." : "Open one, and the chain starts counting."}</p>
                  {!query && <button className="btn lg" onClick={() => setView("open")}>Open a job</button>}
                </div>
              ) : (
                <JobsTable jobs={filtered} unit={unit} sel={sel} setSel={setSel} />
              )}
              {selected && <div style={{ marginTop: 24 }}><JobDetail /></div>}
            </>
          )}

          {view === "open" && (
            <>
              <div className="page-head">
                <div>
                  <h2 className="title">Open a job</h2>
                  <p>You escrow units × price exactly. The contract rejects any other amount, so no dust can exist.</p>
                </div>
              </div>
              {!account ? (
                <div className="empty">
                  <div className="tile">◻</div>
                  <h3>Connect a wallet to escrow</h3>
                  <p>Reading needs no wallet at all — signing does.</p>
                  <button className="btn lg" onClick={v.connect}>Connect wallet</button>
                </div>
              ) : (
                <div className="card pad" style={{ maxWidth: 720 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div className="field" style={{ gridColumn: "1 / -1" }}>
                      <label htmlFor="exec">Executor address</label>
                      <input id="exec" placeholder="0x…" value={form.executor} onChange={(e) => setForm({ ...form, executor: e.target.value })} />
                      <p className="help">The party expected to count the units.</p>
                    </div>
                    <div className="field">
                      <label htmlFor="units">Units</label>
                      <input id="units" type="number" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} />
                    </div>
                    <div className="field">
                      <label htmlFor="price">Price per unit ({unit})</label>
                      <input id="price" type="text" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                    </div>
                    <div className="field">
                      <label htmlFor="hours">Work deadline (hours from now)</label>
                      <input id="hours" type="number" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Escrow required</label>
                      <input readOnly value={`${form.units || 0} × ${form.price || 0} = ${(Number(form.units || 0) * Number(form.price || 0)).toFixed(6)} ${unit}`} />
                    </div>
                  </div>
                  <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
                    <button className="btn lg" disabled={!!busy || !form.executor || !chainOk} onClick={() => run("create", `Escrow ${form.units} units`, async () => {
                      const units = BigInt(form.units), ppu = parseEther(form.price);
                      return (await signerOf(cfg, v)).createJob(form.executor, units, ppu, BigInt(now + Number(form.hours) * 3600), { value: units * ppu });
                    })}>
                      {busy === "create" && <span className="spin" />}Escrow {form.units} × {form.price} {unit}
                    </button>
                    <a className="btn lg secondary" href={cfg?.faucetUrl} target="_blank" rel="noreferrer">Get testnet {unit}</a>
                  </div>
                  {!chainOk && <p className="help" style={{ marginTop: 8 }}>Your wallet is on another network — switch it to {cfg?.chainName} first.</p>}
                </div>
              )}
            </>
          )}

          {view === "settlement" && (
            <>
              <div className="page-head">
                <div>
                  <h2 className="title">Settlement</h2>
                  <p>How a job ends, and what the contract did with each one so far.</p>
                </div>
              </div>
              <div className="steps" style={{ marginBottom: 24 }}>
                <div>
                  <span className="step-num">01</span>
                  <h3>The units are escrowed</h3>
                  <p>Escrow equals units × price exactly. No rounding, no dust, nothing to sweep.</p>
                </div>
                <div>
                  <span className="step-num">02</span>
                  <h3>The executor stops</h3>
                  <p>Counted units stay with whoever counted them. The remainder is listed, not refunded.</p>
                </div>
                <div>
                  <span className="step-num">03</span>
                  <h3>A taker finishes it</h3>
                  <p>Bond at least half the remaining escrow. Miss the deadline and the bond moves to the buyer.</p>
                </div>
              </div>
              {jobs.filter((j) => j.state === 4 || j.state === 5).length === 0 ? (
                <div className="empty">
                  <div className="tile">◻</div>
                  <h3>Nothing has settled yet</h3>
                  <p>A job settles when every unit is counted, or closes by rule when a taker misses the deadline.</p>
                </div>
              ) : (
                <div className="rows">
                  <div className="row-head">
                    <span>Job</span><span>Outcome</span><span>Executor paid</span>
                    <span className="num">Executor</span><span className="num">Taker</span>
                    <span className="num">Bond</span><span>Path</span>
                  </div>
                  {jobs.filter((j) => j.state === 4 || j.state === 5).map((j) => (
                    <div className="row" key={j.id}>
                      <span className="tnum">#{j.id}</span>
                      <span><span className={`badge ${STATE_TONE[STATES[j.state]]}`}><span className={`dot ${STATE_TONE[STATES[j.state]]}`} />{STATES[j.state]}</span></span>
                      <span className="tnum">{asNum(BigInt(j.executorUnits) * j.pricePerUnit, 6)} {unit}</span>
                      <span className="num tnum">{j.executorUnits}</span>
                      <span className="num tnum">{j.takerUnits}</span>
                      <span className="num tnum">{j.bond > 0n ? asNum(j.bond, 6) : "—"}</span>
                      <span className="caption">{j.state === 4 ? "every unit counted" : j.taker !== ZERO ? "taker missed the deadline" : "deadline passed, no taker"}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="caption" style={{ marginTop: 12 }}>
                Executor pay is computed from counted units × price per unit, read from the contract.
              </p>
            </>
          )}
        </div>
      </main>

      <Toasts txs={v.txs} dismissTx={v.dismissTx} cfg={cfg} />
    </div>
  );
}

function JobsTable({ jobs, unit, sel, setSel }) {
  return (
    <div className="rows">
      <div className="row-head">
        <span>Job</span><span>State</span><span>Executor</span>
        <span className="num">Counted</span><span className="num">Left</span>
        <span className="num">Escrow</span><span>Deadline</span>
      </div>
      {jobs.map((j) => (
        <div
          key={j.id}
          className={`row${sel === j.id ? " selected" : ""}`}
          onClick={() => setSel(j.id)}
          onKeyDown={(e) => { if (e.key === "Enter") setSel(j.id); }}
          tabIndex={0}
          role="button"
        >
          <span className="tnum">#{j.id}</span>
          <span><span className={`badge ${STATE_TONE[STATES[j.state]]}`}><span className={`dot ${STATE_TONE[STATES[j.state]]}`} />{STATES[j.state]}</span></span>
          <span className="addr">{shortAddr(j.executor)}</span>
          <span className="num tnum">{j.executorUnits + j.takerUnits} / {j.totalUnits}</span>
          <span className="num tnum">{j.totalUnits - j.executorUnits - j.takerUnits}</span>
          <span className="num tnum">{asNum(j.escrow, 6)} {unit}</span>
          <span className="caption">{new Date(j.workDeadline * 1000).toLocaleDateString()}</span>
        </div>
      ))}
    </div>
  );
}

/* the signer is built from the wallet only when a write actually happens */
async function signerOf(cfg, v) {
  const { BrowserProvider, Contract } = await import("ethers");
  const abi = (await import("./abi.json")).default;
  if (!window.ethereum) throw new Error("no EVM wallet in this browser");
  return new Contract(cfg.venue, abi, await new BrowserProvider(window.ethereum).getSigner());
}
