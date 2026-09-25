import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { JsonRpcProvider, Contract, formatEther } from "ethers";
import abi from "./abi.json";
import { injected, walletName } from "./wallet";

export const STATES = ["Open", "Stalled", "Listed", "Taken", "Settled", "Closed"];
export const ZERO = "0x0000000000000000000000000000000000000000";
export const ZERO32 = "0x" + "0".repeat(64);
export const STATE_TONE = { Open: "info", Stalled: "warning", Listed: "warning", Taken: "info", Settled: "success", Closed: "neutral" };

/* The per-unit receipts, read straight off the contract.
 *
 * A receipt is the artifact the whole mechanism rests on: it is hashed when a unit
 * is counted, stored per unit index, and can never be overwritten — which is why a
 * repeat at the same index is refused rather than accepted. It is also the only way
 * to see which indices are still free before sending a count that would be refused.
 *
 * The reads are issued together rather than one after another, so a ten-unit job is
 * one round of parallel calls, not ten sequential ones. */
export async function readReceipts(cfg, job) {
  if (!cfg || !job) return [];
  const provider = new JsonRpcProvider(cfg.rpcUrl);
  const c = new Contract(cfg.venue, abi, provider);
  const indices = Array.from({ length: job.totalUnits }, (_, i) => i);
  const hashes = await Promise.all(indices.map((i) => c.unitReceipt(job.id, i)));
  return indices.map((i) => ({ index: i, hash: hashes[i] && hashes[i] !== ZERO32 ? hashes[i] : null }));
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
  const [wallet, setWallet] = useState("");
  const [chainOk, setChainOk] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [credits, setCredits] = useState(0n);
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState("");
  const [lastReadAt, setLastReadAt] = useState(0);
  const [busy, setBusy] = useState("");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [txs, setTxs] = useState([]);
  const nextId = useRef(1);

  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`config HTTP ${r.status}`))))
      .then((c) => {
        if (c && c.error) throw new Error(c.error);
        setCfg(c);
      })
      .catch((e) => setCfgError(String(e.message || e)));
  }, []);

  /* one clock, ticked once a second, drives the "passed" deadline badges */
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
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

  const load = useCallback(async (opts = {}) => {
    if (!cfg) return;
    if (!opts.quiet) setReadError("");
    try {
      const provider = new JsonRpcProvider(cfg.rpcUrl);
      const net = await provider.getNetwork();
      const right = Number(net.chainId) === Number(cfg.chainId);
      setChainOk(right);
      if (!right) { setLoading(false); return; }
      const c = new Contract(cfg.venue, abi, provider);
      const count = Number(await c.jobCount());
      const ids = Array.from({ length: count }, (_, i) => i + 1);
      /* read every job in parallel, so the board is one round trip, not N */
      const raw = await Promise.all(ids.map((i) => c.jobs(i)));
      const rows = ids.map((i, k) => {
        const j = raw[k];
        return {
          id: i, buyer: j[0], executor: j[1], totalUnits: Number(j[2]), pricePerUnit: j[3],
          escrow: j[4], executorUnits: Number(j[5]), takerUnits: Number(j[6]),
          workDeadline: Number(j[7]), takerDeadline: Number(j[8]), taker: j[9],
          bond: j[10], state: Number(j[11]),
        };
      });
      rows.reverse();
      setJobs(rows);
      setCredits(account ? await c.credits(account) : 0n);
      setLastReadAt(Date.now());
      setReadError("");
    } catch (e) {
      /* a background refresh must not clobber a good board with an error banner */
      if (!opts.quiet) setReadError(e?.shortMessage || e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [cfg, account]);

  useEffect(() => { if (cfg) load(); }, [cfg, account, load]);

  /* keep the board fresh: a quiet re-read every 20s, and one when the tab regains focus.
     "quiet" means a failed poll leaves the last good board and its timestamp in place. */
  useEffect(() => {
    if (!cfg) return undefined;
    const t = setInterval(() => load({ quiet: true }), 20000);
    const onVisible = () => { if (document.visibilityState === "visible") load({ quiet: true }); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [cfg, load]);

  useEffect(() => {
    const p = injected();
    if (!p) return undefined;
    const onAccounts = (accs) => setAccount(accs?.[0] || "");
    p.on?.("accountsChanged", onAccounts);
    setWallet(walletName());
    return () => p.removeListener?.("accountsChanged", onAccounts);
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
    const p = injected();
    if (!p) { pushTx({ kind: "fail", label: "No EVM wallet found in this browser", detail: "Install OKX Wallet or any EIP-1193 wallet, or read the venue without one — reading never needs a wallet." }); return; }
    try {
      const [addr] = await p.request({ method: "eth_requestAccounts" });
      setAccount(addr);
      setWallet(walletName());
      await ensureChain();
    } catch (e) {
      pushTx({ kind: "fail", label: "Wallet connection refused", detail: e?.message || String(e) });
    }
  }

  async function ensureChain() {
    const p = injected();
    if (!cfg || !p) return;
    try {
      await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: cfg.chainIdHex }] });
      setChainOk(true);
    } catch (e) {
      if (e.code === 4902 || /Unrecognized chain/i.test(e.message || "")) {
        await p.request({
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

  /* Every write follows the same visible lifecycle: pending → confirmed → gone,
     or pending → failed and it stays until dismissed. */
  async function run(key, label, fn, { retry } = {}) {
    if (!injected()) { pushTx({ kind: "fail", label: `${label} — no wallet in this browser`, detail: "Signing needs an EIP-1193 wallet." }); return false; }
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
    cfg, cfgError, account, wallet, chainOk, jobs, credits, stats, loading, readError, lastReadAt, now, txs,
    busy, connect, ensureChain, run, pushTx, dismissTx, load, setAccount, setBusy,
  };
}
