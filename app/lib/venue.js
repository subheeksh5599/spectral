import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserProvider, JsonRpcProvider, Contract, formatEther, parseEther, keccak256, toUtf8Bytes } from "ethers";
import abi from "./abi.json";

export const STATES = ["Open", "Stalled", "Listed", "Taken", "Settled", "Closed"];
export const ZERO = "0x0000000000000000000000000000000000000000";
export const ZERO32 = "0x" + "0".repeat(64);
export const STATE_TONE = { Open: "info", Stalled: "warning", Listed: "warning", Taken: "info", Settled: "success", Closed: "neutral" };

/* The per-unit receipts, read straight off the contract.
 *
 * A receipt is the artifact the whole mechanism rests on: it is hashed when a unit
 * is counted, stored per unit index, and can never be overwritten — which is why a
 * repeat at the same index is refused rather than accepted. It is also the only way
 * to see which indices are still free before sending a count that would be refused. */
export async function readReceipts(cfg, job) {
  if (!cfg || !job) return [];
  const provider = new JsonRpcProvider(cfg.rpcUrl);
  const c = new Contract(cfg.venue, abi, provider);
  const out = [];
  for (let i = 0; i < job.totalUnits; i++) {
    const h = await c.unitReceipt(job.id, i);
    out.push({ index: i, hash: h && h !== ZERO32 ? h : null });
  }
  return out;
}

export const shortAddr = (a) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || "—");
export const asNum = (v, d = 4) => {
  const s = formatEther(v ?? 0n);
  return Number(s) === 0 ? "0" : Number(s).toFixed(d).replace(/0+$/, "").replace(/\.$/, "");
};

/* One hook owns the whole venue: config, reads, wallet, actions and transaction
   lifecycle. Reads go through the chain's own RPC, so a visitor with no wallet
   still sees real state; a wallet is needed only to sign. */
export function useVenue() {
  const [cfg, setCfg] = useState(null);
  const [cfgError, setCfgError] = useState("");
  const [account, setAccount] = useState("");
  const [chainOk, setChainOk] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [credits, setCredits] = useState(0n);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState("");
  const [lastReadAt, setLastReadAt] = useState(0);
  const [busy, setBusy] = useState("");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [tick, setTick] = useState(0);
  const [txs, setTxs] = useState([]);
  const nextId = useRef(1);

  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`config HTTP ${r.status}`))))
      .then(setCfg)
      .catch((e) => setCfgError(String(e.message || e)));
  }, []);

  useEffect(() => {
    const a = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 5000);
    const b = setInterval(() => setTick((t) => t + 1), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);

  const pushTx = useCallback((tx) => {
    const id = nextId.current++;
    setTxs((list) => [...list, { id, ...tx }]);
    return id;
  }, []);
  const patchTx = useCallback((id, patch) => {
    setTxs((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);
  const dismissTx = useCallback((id) => setTxs((list) => list.filter((t) => t.id !== id)), []);

  const load = useCallback(async () => {
    if (!cfg) return;
    setReadError("");
    try {
      const provider = new JsonRpcProvider(cfg.rpcUrl);
      const net = await provider.getNetwork();
      const right = Number(net.chainId) === Number(cfg.chainId);
      setChainOk(right);
      if (!right) { setLoading(false); return; }
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
      setLastReadAt(Date.now());
    } catch (e) {
      setReadError(e?.shortMessage || e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [cfg, account]);

  useEffect(() => { if (cfg) load(); }, [cfg, account, load]);

  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = (accs) => setAccount(accs?.[0] || "");
    window.ethereum.on?.("accountsChanged", onAccounts);
    return () => window.ethereum.removeListener?.("accountsChanged", onAccounts);
  }, []);

  const stats = useMemo(() => {
    const units = jobs.reduce((a, j) => a + j.totalUnits, 0);
    const counted = jobs.reduce((a, j) => a + j.executorUnits + j.takerUnits, 0);
    const settled = jobs.filter((j) => j.state === 4).length;
    const closed = jobs.filter((j) => j.state === 5).length;
    const live = jobs.filter((j) => j.state !== 4 && j.state !== 5);
    const locked = live.reduce((a, j) => a + BigInt(j.escrow) + BigInt(j.bond || 0), 0n);
    const open = live.filter((j) => j.state === 0 || j.state === 1).length;
    const listed = live.filter((j) => j.state === 2).length;
    return { units, counted, settled, closed, locked, open, listed, live: live.length, pct: units ? Math.round((counted / units) * 100) : 0 };
  }, [jobs]);

  async function connect() {
    if (!window.ethereum) { pushTx({ kind: "fail", label: "No EVM wallet found in this browser", detail: "Install a browser wallet, or read the venue without one — reading never needs a wallet." }); return; }
    try {
      const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(addr);
      await ensureChain();
    } catch (e) {
      pushTx({ kind: "fail", label: "Wallet connection refused", detail: e?.message || String(e) });
    }
  }

  async function ensureChain() {
    if (!cfg) return;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: cfg.chainIdHex }] });
      setChainOk(true);
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
        setChainOk(true);
      } else {
        pushTx({ kind: "fail", label: "Could not switch the wallet to the venue chain", detail: e?.message || String(e) });
      }
    }
  }

  const signer = async () => new Contract(cfg.venue, abi, await new BrowserProvider(window.ethereum).getSigner());

  /* Every write follows the same visible lifecycle: pending → confirmed → gone,
     or pending → failed and it stays until dismissed. */
  async function run(key, label, fn, { retry } = {}) {
    if (!window.ethereum) { pushTx({ kind: "fail", label: `${label} — no wallet in this browser`, detail: "Signing needs an EVM wallet." }); return false; }
    setBusy(key);
    const id = pushTx({ kind: "pending", label, detail: "Waiting for confirmation…" });
    try {
      const tx = await fn();
      const rc = await tx.wait();
      patchTx(id, {
        kind: "ok", label: `${label} — confirmed`,
        detail: `block ${rc.blockNumber}`,
        hash: rc.hash,
      });
      await load();
      return true;
    } catch (e) {
      patchTx(id, {
        kind: "fail",
        label: `${label} — refused on chain`,
        detail: e?.shortMessage || e?.reason || e?.message || String(e),
        retry: retry || null,
      });
      return false;
    } finally { setBusy(""); }
  }

  return {
    cfg, cfgError, account, chainOk, jobs, credits, stats, loading, readError, lastReadAt, now, tick, txs,
    busy, connect, ensureChain, run, dismissTx, load, setAccount, setBusy,
  };
}
