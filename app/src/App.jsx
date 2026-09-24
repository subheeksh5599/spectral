import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, JsonRpcProvider, Contract, formatEther, parseEther, keccak256, toUtf8Bytes } from "ethers";
import abi from "./abi.json";

const STATES = ["Open", "Stalled", "Listed", "Taken", "Settled", "Closed"];
const ZERO = "0x0000000000000000000000000000000000000000";
const STATE_DOT = { Open: "blue", Stalled: "amber", Listed: "amber", Taken: "amber", Settled: "navy", Closed: "stone" };

export default function App() {
  const [cfg, setCfg] = useState(null);
  const [cfgError, setCfgError] = useState("");
  const [account, setAccount] = useState("");
  const [chainOk, setChainOk] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [credits, setCredits] = useState(0n);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [msg, setMsg] = useState({ kind: "", text: "" });
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ executor: "", units: "10", price: "0.001", hours: "24" });
  const [unitInput, setUnitInput] = useState({});
  const [listMinutes, setListMinutes] = useState({});

  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("config HTTP " + r.status))))
      .then(setCfg)
      .catch((e) => setCfgError(String(e.message || e)));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 5000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    if (!cfg) return;
    // Reading never needs a wallet: use the chain's own RPC from the served config.
    const provider = new JsonRpcProvider(cfg.rpcUrl);
    const net = await provider.getNetwork();
    const right = Number(net.chainId) === Number(cfg.chainId);
    setChainOk(right);
    if (!right) return;
    const c = new Contract(cfg.venue, abi, provider);
    const count = Number(await c.jobCount());
    const rows = [];
    for (let i = 1; i <= count; i++) {
      const j = await c.jobs(i);
      rows.push({
        id: i, buyer: j[0], executor: j[1], totalUnits: Number(j[2]), pricePerUnit: j[3],
        escrow: j[4], executorUnits: Number(j[5]), takerUnits: Number(j[6]),
        workDeadline: Number(j[7]), takerDeadline: Number(j[8]), taker: j[9],
        bond: j[10], state: Number(j[11]),
      });
    }
    setJobs(rows.reverse());
    if (account) setCredits(await c.credits(account));
    if (window.ethereum) {
      const walletNet = await new BrowserProvider(window.ethereum).getNetwork().catch(() => null);
      setChainOk(!walletNet || Number(walletNet.chainId) === Number(cfg.chainId));
    }
  }, [cfg, account]);

  useEffect(() => { if (cfg) load().catch((e) => setMsg({ kind: "err", text: "chain read failed: " + (e?.message || e) })); }, [cfg, account, load]);

  const stats = useMemo(() => {
    const units = jobs.reduce((a, j) => a + j.totalUnits, 0);
    const counted = jobs.reduce((a, j) => a + j.executorUnits + j.takerUnits, 0);
    const settled = jobs.filter((j) => j.state === 4).length;
    const closed = jobs.filter((j) => j.state === 5).length;
    const locked = jobs.filter((j) => j.state !== 4 && j.state !== 5)
      .reduce((a, j) => a + BigInt(j.escrow) + BigInt(j.bond || 0), 0n);
    return { units, counted, settled, closed, locked, pct: units ? Math.round((counted / units) * 100) : 0 };
  }, [jobs]);

  async function connect() {
    setMsg({ kind: "", text: "" });
    if (!window.ethereum) return setMsg({ kind: "err", text: "no EVM wallet in this browser" });
    try {
      const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(addr);
      await ensureChain();
    } catch (e) { setMsg({ kind: "err", text: e.message || String(e) }); }
  }

  async function ensureChain() {
    if (!cfg) return;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: cfg.chainIdHex }] });
    } catch (e) {
      if (e.code === 4902 || /Unrecognized chain/i.test(e.message || "")) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: cfg.chainIdHex, chainName: cfg.chainName,
            nativeCurrency: { name: cfg.nativeSymbol, symbol: cfg.nativeSymbol, decimals: 18 },
            rpcUrls: [cfg.rpcUrl], blockExplorerUrls: [cfg.explorerUrl],
          }],
        });
      } else throw e;
    }
  }

  const signer = async () => new Contract(cfg.venue, abi, await new BrowserProvider(window.ethereum).getSigner());

  async function run(label, fn) {
    setBusy(true); setMsg({ kind: "", text: "" });
    try {
      const tx = await fn();
      const rc = await tx.wait();
      setMsg({ kind: "ok", text: `${label} — confirmed in block ${rc.blockNumber} · tx ${rc.hash}` });
      await load();
    } catch (e) {
      setMsg({ kind: "err", text: `${label} — refused: ${e?.shortMessage || e?.reason || e?.message || String(e)}` });
    } finally { setBusy(false); }
  }

  if (cfgError) {
    return (
      <div className="shell">
        <div className="notice err">
          Refusing to run without chain configuration: {cfgError}
          {"\n"}Required: CHAIN_ID, CHAIN_NAME, RPC_URL, EXPLORER_URL, NATIVE_SYMBOL, FAUCET_URL, VENUE_ADDRESS.
          {"\n"}There are no defaults in the code, so the app can never quietly talk to the wrong chain.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="shell">
        <nav className="nav">
          <span className="wordmark">obligo</span>
          <a className="navlink" href="#how">How it settles</a>
          <a className="navlink" href="#obligations">Obligations</a>
          <a className="navlink" href="#questions">Questions</a>
          <span className="spacer" />
          {cfg && <span className="pill plain mono">{cfg.chainName} · {cfg.chainId}</span>}
          {!account
            ? <button onClick={connect} disabled={!cfg || busy}>Connect wallet</button>
            : <>
                <span className="pill mono">{account.slice(0, 6)}…{account.slice(-4)}</span>
                {!chainOk && <button className="ghost small" onClick={ensureChain}>Switch chain</button>}
              </>}
        </nav>

        <section className="hero">
          <div>
            <p className="eyebrow">Onchain work settlement · X Layer</p>
            <h1 className="display">Unfinished work, still <em>payable</em>.</h1>
            <p className="lede">
              A job is a set of countable units. When the executor stops, the remaining units are
              listed, another party takes them over against a bond, and settlement is arithmetic
              over counted units. No oracle. No jury. No admin.
            </p>
            <div className="hero-actions">
              {!account
                ? <button onClick={connect} disabled={busy || !cfg}>Open the venue</button>
                : <a className="btn" href="#obligations">Go to the obligations</a>}
              <a className="btn ghost" href={cfg?.faucetUrl} target="_blank" rel="noreferrer">Get testnet {cfg?.nativeSymbol}</a>
            </div>
            <p className="note">
              {jobs.length} job{jobs.length === 1 ? "" : "s"} on this contract · read live, nothing cached.
            </p>
          </div>

          <div className="panel">
            <div className="gauge">
              <div className="dial" style={{ "--pct": stats.pct }}>
                <div>{stats.pct}%</div>
              </div>
              <div>
                <p className="eyebrow" style={{ marginBottom: 6 }}>Units counted</p>
                <p className="muted" style={{ margin: 0 }}>
                  {stats.counted} of {stats.units} registered across every job on this contract.
                </p>
              </div>
            </div>
            <div className="metric-row"><span>Settled jobs</span><b><span className="dots"><i className="dot navy" /></span>{stats.settled}</b></div>
            <div className="metric-row"><span>Closed by rule</span><b><span className="dots"><i className="dot stone" /></span>{stats.closed}</b></div>
            <div className="metric-row"><span>Escrow still locked</span><b>{formatEther(stats.locked)} {cfg?.nativeSymbol}</b></div>
            <div className="metric-row"><span>Your claimable</span><b>{formatEther(credits)} {cfg?.nativeSymbol}</b></div>
            <div className="metric-row"><span>Venue</span><b className="mono">{cfg ? cfg.venue.slice(0, 10) + "…" + cfg.venue.slice(-6) : "…"}</b></div>
            <div className="row">
              {account && credits > 0n && <button className="small" disabled={busy} onClick={() => run("claim", async () => (await signer()).claim())}>Claim {formatEther(credits)} {cfg?.nativeSymbol}</button>}
              {cfg && <a className="chip" href={`${cfg.explorerUrl}/address/${cfg.venue}`} target="_blank" rel="noreferrer">View contract</a>}
            </div>
          </div>
        </section>

        {msg.text && <div className={`notice ${msg.kind === "ok" ? "ok" : "err"}`}>{msg.text}</div>}

        <h2 className="section" id="how">How it <em>settles</em></h2>
        <div className="steps">
          <div className="step dark">
            <span className="num">1</span>
            <h3>The units are escrowed</h3>
            <p>Escrow must equal units × price exactly, so no rounding dust can exist anywhere in the system.</p>
          </div>
          <div className="step">
            <span className="num">2</span>
            <h3>The executor stops</h3>
            <p>Whatever was counted stays theirs. The remainder becomes a listed obligation instead of a refund.</p>
          </div>
          <div className="step accent">
            <span className="num">3</span>
            <h3>A taker finishes it</h3>
            <p>Against a bond of at least half the remaining escrow. Miss the deadline and the bond goes to the buyer, by rule.</p>
          </div>
        </div>

        <h2 className="section" id="obligations">The <em>obligations</em></h2>

        {account && chainOk && (
          <div className="job" style={{ marginBottom: "var(--spacing-24)" }}>
            <h3 className="card-title">Open a job</h3>
            <div className="two">
              <div><label>executor address</label><input value={form.executor} onChange={(e) => setForm({ ...form, executor: e.target.value })} placeholder="0x…" /></div>
              <div><label>units</label><input value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} /></div>
              <div><label>price per unit ({cfg?.nativeSymbol})</label><input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              <div><label>work deadline (hours)</label><input value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></div>
            </div>
            <div className="row">
              <button disabled={busy || !form.executor} onClick={() => run("createJob", async () => {
                const units = BigInt(form.units), ppu = parseEther(form.price);
                const deadline = BigInt(now + Number(form.hours) * 3600);
                return (await signer()).createJob(form.executor, units, ppu, deadline, { value: units * ppu });
              })}>Escrow {form.units} × {form.price} {cfg?.nativeSymbol}</button>
            </div>
            <p className="note">The contract rejects any escrow that is not exactly units × price.</p>
          </div>
        )}

        {!account && <p className="note">Connect a wallet to act on these. Reading needs no wallet at all.</p>}
        {account && chainOk && jobs.length === 0 && <p className="note">No jobs on this contract yet — open the first one above.</p>}

        <div className="board">
          {jobs.map((j) => {
            const me = account?.toLowerCase();
            const remaining = j.totalUnits - j.executorUnits - j.takerUnits;
            const isExecutor = me && j.executor.toLowerCase() === me;
            const isTaker = me && j.taker.toLowerCase() === me;
            const isBuyer = me && j.buyer.toLowerCase() === me;
            const bondReq = (BigInt(remaining) * j.pricePerUnit) / 2n;
            const u = unitInput[j.id] || "";
            const lm = listMinutes[j.id] || "60";
            const terminal = j.state === 4 || j.state === 5;
            return (
              <div className={`job${terminal ? " terminal" : ""}`} key={j.id}>
                <div className="row" style={{ marginTop: 0, justifyContent: "space-between" }}>
                  <h3 className="card-title" style={{ margin: 0 }}>Job {j.id}</h3>
                  <span className={`pill ${j.state === 4 ? "settled" : ""}`}>
                    <span className="dots"><i className={`dot ${STATE_DOT[STATES[j.state]]}`} /></span>
                    {STATES[j.state]}
                  </span>
                </div>
                <div className="kv">
                  <span>buyer</span><b className="mono">{j.buyer}</b>
                  <span>executor</span><b className="mono">{j.executor}</b>
                  <span>escrow</span><b>{formatEther(j.escrow)} {cfg?.nativeSymbol}</b>
                  <span>counted</span><b>{j.executorUnits} executor · {j.takerUnits} taker · {remaining} left</b>
                  <span>deadline</span><b>{new Date(j.workDeadline * 1000).toLocaleString()}{now > j.workDeadline ? " · passed" : ""}</b>
                  {j.taker !== ZERO && <><span>taker</span><b className="mono">{j.taker}</b></>}
                  {j.bond > 0n && <><span>bond</span><b>{formatEther(j.bond)} {cfg?.nativeSymbol}</b></>}
                  {j.state === 3 && <><span>taker deadline</span><b>{new Date(j.takerDeadline * 1000).toLocaleString()}{now > j.takerDeadline ? " · passed" : ""}</b></>}
                </div>

                {((j.state === 0 && isExecutor) || (j.state === 3 && isTaker)) && (
                  <>
                    <label>count a finished unit — its index, and a receipt</label>
                    <input placeholder="unit index" value={u} onChange={(e) => setUnitInput({ ...unitInput, [j.id]: e.target.value })} />
                    <div className="row">
                      <button className="small" disabled={busy || u === ""} onClick={() => run(`count unit ${u}`, async () =>
                        (await signer()).countUnit(j.id, BigInt(u), keccak256(toUtf8Bytes(`receipt:${j.id}:${u}:${Date.now()}`))))}>
                        Count unit
                      </button>
                    </div>
                    <p className="note">The receipt is hashed in the browser and stored per index — a second attempt at the same index is refused on chain.</p>
                  </>
                )}

                <div className="row">
                  {j.state === 0 && isExecutor && (
                    <button className="ghost small" disabled={busy} onClick={() => run("declareStalled", async () => (await signer()).declareStalled(j.id))}>I am stopping</button>)}
                  {j.state === 0 && !isExecutor && now > j.workDeadline && (
                    <button className="ghost small" disabled={busy} onClick={() => run("declareStalled", async () => (await signer()).declareStalled(j.id))}>Deadline passed — declare stall</button>)}
                  {j.state === 1 && (<>
                    <input style={{ width: 92 }} value={lm} onChange={(e) => setListMinutes({ ...listMinutes, [j.id]: e.target.value })} />
                    <button className="small" disabled={busy} onClick={() => run("listObligation", async () => (await signer()).listObligation(j.id, BigInt(now + Number(lm) * 60)))}>List for takeover · {lm} min</button></>)}
                  {j.state === 2 && (
                    <button className="small" disabled={busy} onClick={() => run("takeObligation", async () => (await signer()).takeObligation(j.id, { value: bondReq }))}>Take over {remaining} units · bond {formatEther(bondReq)} {cfg?.nativeSymbol}</button>)}
                  {j.state === 3 && now > j.takerDeadline && remaining > 0 && (
                    <button className="ghost small" disabled={busy} onClick={() => run("closeFailed", async () => (await signer()).closeFailed(j.id))}>Taker missed the deadline — close by rule</button>)}
                  {j.state === 4 && <span className="note" style={{ margin: 0 }}>Settled: executor paid for {j.executorUnits}, taker for {j.takerUnits} plus the bond.</span>}
                  {j.state === 5 && <span className="note" style={{ margin: 0 }}>Closed by rule: the bond went to the buyer; each party kept pay for what it counted.</span>}
                </div>
                {(isBuyer || isExecutor || isTaker) && (
                  <p className="note">your role: {[isBuyer && "buyer", isExecutor && "executor", isTaker && "taker"].filter(Boolean).join(" + ")}</p>)}
              </div>
            );
          })}
        </div>

        <div className="faq" id="questions">
          <h2 className="section">The honest <em>questions</em></h2>
          <div>
            <details className="qa"><summary>How does the contract know the work was really done?</summary>
              <p>It does not judge quality. It counts per-unit receipts and refuses duplicates. Whether a receipt corresponds to good work is the buyer's acceptance rule — stated as a limit, not hidden.</p></details>
            <details className="qa"><summary>Why would a taker take someone else's unfinished job?</summary>
              <p>Because they buy the remainder below its face value only when they are cheaper at doing it, and their bond is their own money at risk if they are wrong.</p></details>
            <details className="qa"><summary>What stops a taker from taking the job and stalling?</summary>
              <p>The deadline rule. They are paid only for units they actually counted, and their bond moves to the buyer. There is no dispute to file and no jury to persuade.</p></details>
            <details className="qa"><summary>Is this a fork of something bigger?</summary>
              <p>No — it is a deliberately narrow slice: matching by listing, settlement by arithmetic, fully collateralised, with no leverage and therefore no margin or liquidation engine.</p></details>
            <details className="qa"><summary>What is not finished?</summary>
              <p>Source verification on the explorer, a hosted URL, the recorded demo, and third-party participation. All four are listed as pending in the repository's status file.</p></details>
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="inner">
          <div>
            <h3>The obligation outlives the agent.</h3>
            <p>Settlement is arithmetic over counted units. Every number on this page is read from the chain at render time; nothing is cached, seeded or mocked.</p>
          </div>
          <div>
            <p className="mono">{cfg ? cfg.venue : ""}</p>
            <p>{cfg ? cfg.chainName : ""} · chain {cfg ? cfg.chainId : ""}</p>
            <p><a href={cfg?.faucetUrl} target="_blank" rel="noreferrer">Testnet faucet</a></p>
          </div>
        </div>
      </footer>

      <div className="widget">
        <div className="head">
          <span className="avatar" />
          <span>{msg.text ? (msg.kind === "ok" ? "Last action confirmed." : "Last action refused.") : "Reading the venue live."}</span>
        </div>
        <div className="chips">
          {!account && <a className="chip" href="#" onClick={(e) => { e.preventDefault(); connect(); }}>Connect wallet</a>}
          <a className="chip" href={`${cfg?.explorerUrl}/address/${cfg?.venue}`} target="_blank" rel="noreferrer">Contract</a>
          <a className="chip" href={cfg?.faucetUrl} target="_blank" rel="noreferrer">Faucet</a>
          {account && <a className="chip" href="#obligations">Obligations</a>}
        </div>
        {msg.text && <div className="line mono">{msg.text}</div>}
      </div>
    </>
  );
}
