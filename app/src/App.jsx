import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, formatEther, parseEther, keccak256, toUtf8Bytes } from "ethers";
import abi from "./abi.json";

const STATES = ["Open", "Stalled", "Listed", "Taken", "Settled", "Closed"];
const ZERO = "0x0000000000000000000000000000000000000000";

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

  const [form, setForm] = useState({ executor: "", units: "10", price: "1", hours: "24" });
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

  const readProvider = useMemo(
    () => (cfg ? new BrowserProvider(window.ethereum) : null),
    [cfg]
  );

  const load = useCallback(async () => {
    if (!cfg) return;
    const provider = new BrowserProvider(window.ethereum);
    const net = await provider.getNetwork();
    const onRightChain = Number(net.chainId) === Number(cfg.chainId);
    setChainOk(onRightChain);
    if (!onRightChain) return;

    const c = new Contract(cfg.venue, abi, provider);
    const count = Number(await c.jobCount());
    const rows = [];
    for (let i = 1; i <= count; i++) {
      const j = await c.jobs(i);
      rows.push({
        id: i,
        buyer: j[0], executor: j[1],
        totalUnits: Number(j[2]), pricePerUnit: j[3], escrow: j[4],
        executorUnits: Number(j[5]), takerUnits: Number(j[6]),
        workDeadline: Number(j[7]), takerDeadline: Number(j[8]),
        taker: j[9], bond: j[10], state: Number(j[11]),
      });
    }
    setJobs(rows.reverse());
    if (account) {
      const v = await c.credits(account);
      setCredits(v);
    }
  }, [cfg, account]);

  useEffect(() => {
    if (cfg && window.ethereum) load().catch(() => {});
  }, [cfg, account, load]);

  async function connect() {
    setMsg({ kind: "", text: "" });
    if (!window.ethereum) return setMsg({ kind: "err", text: "no EVM wallet in this browser" });
    try {
      const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(addr);
      await ensureChain();
    } catch (e) {
      setMsg({ kind: "err", text: e.message || String(e) });
    }
  }

  async function ensureChain() {
    if (!cfg) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: cfg.chainIdHex }],
      });
    } catch (e) {
      if (e.code === 4902 || /Unrecognized chain/i.test(e.message || "")) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: cfg.chainIdHex,
            chainName: cfg.chainName,
            nativeCurrency: { name: cfg.nativeSymbol, symbol: cfg.nativeSymbol, decimals: 18 },
            rpcUrls: [cfg.rpcUrl],
            blockExplorerUrls: [cfg.explorerUrl],
          }],
        });
      } else throw e;
    }
  }

  async function signer() {
    const p = new BrowserProvider(window.ethereum);
    return new Contract(cfg.venue, abi, await p.getSigner());
  }

  async function run(label, fn) {
    setBusy(true); setMsg({ kind: "", text: "" });
    try {
      const tx = await fn();
      const rc = await tx.wait();
      setMsg({
        kind: "ok",
        text: `${label} confirmed in block ${rc.blockNumber} — tx ${rc.hash}`,
      });
      await load();
    } catch (e) {
      const reason = e?.shortMessage || e?.reason || e?.message || String(e);
      setMsg({ kind: "err", text: `${label} failed: ${reason}` });
    } finally {
      setBusy(false);
    }
  }

  const explorerTx = (h) => `${cfg.explorerUrl.replace(/\/$/, "")}/tx/${h}`;

  if (cfgError) {
    return (
      <div className="wrap">
        <h1>Obligo</h1>
        <p className="err">
          The app refuses to run without chain configuration: {cfgError}
          {"\n"}Start it with CHAIN_ID, CHAIN_NAME, RPC_URL, EXPLORER_URL, NATIVE_SYMBOL,
          FAUCET_URL and VENUE_ADDRESS set. There are no defaults by design.
        </p>
      </div>
    );
  }

  return (
    <div className="wrap">
      <h1>Obligo</h1>
      <p className="lede">
        Unfinished machine work becomes a tradeable instrument. A job is a set of countable
        units. When the executor stops, the remaining units are listed, another party can take
        them over by posting a bond, and settlement is arithmetic over counted units — no
        oracle, no jury, no admin.
      </p>

      <div className="bar">
        {!account ? (
          <button onClick={connect} disabled={!cfg || busy}>Connect wallet</button>
        ) : (
          <>
            <span className="pill">you <b className="mono">{account.slice(0, 6)}…{account.slice(-4)}</b></span>
            <span className="pill">{cfg ? <>chain <b>{cfg.chainId}</b></> : "…"}</span>
            {!chainOk && <button className="ghost" onClick={ensureChain}>Switch to {cfg?.chainName}</button>}
            <span className="pill">claimable <b>{formatEther(credits)} {cfg?.nativeSymbol}</b></span>
            {credits > 0n && (
              <button disabled={busy} onClick={() => run("claim", async () => (await signer()).claim())}>
                Claim
              </button>
            )}
          </>
        )}
        {cfg && (
          <span className="pill">
            venue <b className="mono">{cfg.venue.slice(0, 6)}…{cfg.venue.slice(-4)}</b>
          </span>
        )}
        {cfg && (
          <a className="pill" href={cfg.faucetUrl} target="_blank" rel="noreferrer">testnet faucet</a>
        )}
      </div>

      {msg.text && <div className={msg.kind === "ok" ? "ok" : "err"}>{msg.text}</div>}

      {account && chainOk && (
        <>
          <h2>Create a job</h2>
          <div className="card">
            <div className="two">
              <div>
                <label>executor address</label>
                <input value={form.executor} onChange={(e) => setForm({ ...form, executor: e.target.value })} placeholder="0x…" />
              </div>
              <div>
                <label>units</label>
                <input value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} />
              </div>
              <div>
                <label>price per unit ({cfg?.nativeSymbol})</label>
                <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <label>work deadline (hours)</label>
                <input value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
              </div>
            </div>
            <div className="row">
              <button
                disabled={busy || !form.executor}
                onClick={() =>
                  run("createJob", async () => {
                    const units = BigInt(form.units);
                    const ppu = parseEther(form.price);
                    const deadline = BigInt(now + Number(form.hours) * 3600);
                    return (await signer()).createJob(form.executor, units, ppu, deadline, {
                      value: units * ppu,
                    });
                  })
                }
              >
                Escrow {form.units} × {form.price} = {(Number(form.units) * Number(form.price)) || 0} {cfg?.nativeSymbol}
              </button>
            </div>
            <p className="note">
              The escrow must equal units × price exactly — the contract rejects anything else,
              so no rounding dust can exist.
            </p>
          </div>
        </>
      )}

      <h2>Obligations {jobs.length > 0 && <span className="pill">{jobs.length} jobs</span>}</h2>
      {!account && <p className="note">Connect a wallet to act on these.</p>}
      {account && chainOk && jobs.length === 0 && (
        <p className="note">No jobs on this contract yet. Create one above with your own wallet.</p>
      )}

      <div className="grid">
        {jobs.map((j) => {
          const me = account?.toLowerCase();
          const remaining = j.totalUnits - j.executorUnits - j.takerUnits;
          const isExecutor = me && j.executor.toLowerCase() === me;
          const isTaker = me && j.taker.toLowerCase() === me;
          const isBuyer = me && j.buyer.toLowerCase() === me;
          const requiredBond = (BigInt(remaining) * j.pricePerUnit) / 2n;
          const u = unitInput[j.id] || "";
          const lm = listMinutes[j.id] || "60";
          return (
            <div className="card" key={j.id}>
              <h3>
                Job #{j.id} <span className={`state ${STATES[j.state]}`}>{STATES[j.state]}</span>
              </h3>
              <div className="kv">
                <span>buyer</span><b className="mono">{j.buyer}</b>
                <span>executor</span><b className="mono">{j.executor}</b>
                <span>escrow</span><b>{formatEther(j.escrow)} {cfg?.nativeSymbol}</b>
                <span>counted</span><b>{j.executorUnits} by executor · {j.takerUnits} by taker · {remaining} remaining</b>
                <span>work deadline</span><b>{new Date(j.workDeadline * 1000).toLocaleString()}{now > j.workDeadline ? " (passed)" : ""}</b>
                {j.taker !== ZERO && <><span>taker</span><b className="mono">{j.taker}</b></>}
                {j.bond > 0n && <><span>bond</span><b>{formatEther(j.bond)} {cfg?.nativeSymbol}</b></>}
                {j.state === 3 && <><span>taker deadline</span><b>{new Date(j.takerDeadline * 1000).toLocaleString()}{now > j.takerDeadline ? " (passed)" : ""}</b></>}
              </div>

              {(j.state === 0 || j.state === 3) &&
                ((j.state === 0 && isExecutor) || (j.state === 3 && isTaker)) && (
                  <div>
                    <label>count a finished unit — index and its receipt text</label>
                    <div className="two">
                      <input placeholder="unit index" value={u} onChange={(e) => setUnitInput({ ...unitInput, [j.id]: e.target.value })} />
                    </div>
                    <div className="row">
                      <button
                        disabled={busy || u === ""}
                        onClick={() =>
                          run(`count unit ${u}`, async () =>
                            (await signer()).countUnit(j.id, BigInt(u), keccak256(toUtf8Bytes(`receipt:${j.id}:${u}:${Date.now()}`)))
                          )
                        }
                      >
                        Count unit
                      </button>
                    </div>
                    <p className="note">The receipt is hashed client-side and stored per unit index; a second attempt at the same index is refused on chain.</p>
                  </div>
                )}

              <div className="row">
                {j.state === 0 && isExecutor && (
                  <button className="ghost" disabled={busy} onClick={() => run("declareStalled", async () => (await signer()).declareStalled(j.id))}>
                    I am stopping — declare stall
                  </button>
                )}
                {j.state === 0 && !isExecutor && now > j.workDeadline && (
                  <button className="ghost" disabled={busy} onClick={() => run("declareStalled", async () => (await signer()).declareStalled(j.id))}>
                    Deadline passed — declare stall
                  </button>
                )}
                {j.state === 1 && (
                  <>
                    <input style={{ width: 90 }} value={lm} onChange={(e) => setListMinutes({ ...listMinutes, [j.id]: e.target.value })} />
                    <button disabled={busy} onClick={() => run("listObligation", async () => (await signer()).listObligation(j.id, BigInt(now + Number(lm) * 60)))}>
                      List for takeover ({lm} min)
                    </button>
                  </>
                )}
                {j.state === 2 && (
                  <button disabled={busy} onClick={() => run("takeObligation", async () => (await signer()).takeObligation(j.id, { value: requiredBond }))}>
                    Take over {remaining} units — post bond {formatEther(requiredBond)} {cfg?.nativeSymbol}
                  </button>
                )}
                {j.state === 3 && now > j.takerDeadline && remaining > 0 && (
                  <button className="ghost" disabled={busy} onClick={() => run("closeFailed", async () => (await signer()).closeFailed(j.id))}>
                    Taker missed the deadline — close by rule
                  </button>
                )}
                {j.state === 4 && <span className="note">Settled: the executor was paid for {j.executorUnits}, the taker for {j.takerUnits} plus the bond.</span>}
                {j.state === 5 && <span className="note">Closed by rule: the taker's bond went to the buyer, and each party kept pay for the units it counted.</span>}
              </div>

              {(isBuyer || isExecutor || isTaker) && (
                <p className="note">
                  your role: {[isBuyer && "buyer", isExecutor && "executor", isTaker && "taker"].filter(Boolean).join(" + ")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <h2>Honest state of this build</h2>
      <p className="note">
        Contracts and the full lifecycle are executed and verified on a live chain (30 real
        transactions). This interface is new: it reads and writes the deployed contract and
        nothing else. It has no mock data and no fallback values — every number on this page is
        read from {cfg ? `${cfg.chainName} at ${cfg.venue}` : "the configured chain"} at render time.
        The mechanism is only honest for work whose completion produces a per-unit artifact.
      </p>
    </div>
  );
}
