"use client";

/* Signing, for the second market.
 *
 * The panel above this file is server-rendered and reads only. This hook is what makes the
 * second market something a visitor can ACT on rather than look at: the same escalation the
 * native market has — read with no wallet, sign with one — applied to the token-denominated
 * deployment, whose escrow and bonds are an ERC-20 instead of native value.
 *
 * Two differences from the native market drive the shape of this file:
 *
 *  1. Taking a listing here is two transactions, not one: the market pulls the bond with
 *     transferFrom, so the taker must approve the market for at least the bond first. The
 *     approve and the take are awaited one after the other, because a take simulated against
 *     an unconfirmed approve reverts.
 *  2. The asset is a replica token with an open faucet, so a taker who holds none does not
 *     have to leave the page to find some: if the balance is short, the flow mints the
 *     shortfall first and says so, rather than failing with an ERC-20 error.
 *
 * Nothing here is simulated: every action lands as a signed transaction on the chain the
 * config names, and the board is re-read afterwards so the numbers on screen are the chain's.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserProvider, Contract, JsonRpcProvider, formatUnits, parseUnits } from "ethers";
import marketAbi from "./abi-token.json";
import equityAbi from "./abi-equity.json";
import { injected, walletName } from "./wallet";

const ZERO = "0x0000000000000000000000000000000000000000";

/* How much of the replica token one click mints when the taker is short: the bond plus a
   tenth of margin, rounded up to a whole token. Small on purpose — the faucet is a faucet,
   not a distribution. */
export function mintFor(bond, decimals) {
  if (!bond || bond <= 0n) return 0n;
  const tenth = bond / 10n;
  const raw = bond + tenth;
  const unit = 10n ** BigInt(decimals);
  return ((raw + unit - 1n) / unit) * unit;
}

export function useTokenVenue() {
  const router = useRouter();
  const [cfg, setCfg] = useState(null);
  const [cfgError, setCfgError] = useState("");
  const [account, setAccount] = useState("");
  const [wallet, setWallet] = useState("");
  const [chainOk, setChainOk] = useState(null);
  const [board, setBoard] = useState(null);
  const [readError, setReadError] = useState("");
  const [asset, setAsset] = useState(null); // { symbol, decimals, balance, allowance }
  const [busy, setBusy] = useState("");
  const [steps, setSteps] = useState([]); // the inline lifecycle, in order
  const nextId = useRef(1);

  const step = useCallback((s) => {
    const id = nextId.current++;
    setSteps((list) => [...list, { id, ...s }]);
    return id;
  }, []);
  const patchStep = useCallback((id, p) => {
    setSteps((list) => list.map((s) => (s.id === id ? { ...s, ...p } : s)));
  }, []);
  const clearSteps = useCallback(() => setSteps([]), []);

  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`config HTTP ${r.status}`))))
      .then((c) => {
        if (c?.error) throw new Error(c.error);
        if (!c?.token?.venue) throw new Error("this deployment has no second market configured");
        setCfg(c);
      })
      .catch((e) => setCfgError(String(e.message || e)));
  }, []);

  useEffect(() => {
    const p = injected();
    if (!p) return undefined;
    const onAccounts = (accs) => setAccount(accs?.[0] || "");
    p.on?.("accountsChanged", onAccounts);
    setWallet(walletName());
    return () => p.removeListener?.("accountsChanged", onAccounts);
  }, []);

  /* The board comes from the same public reader the API route uses, so this hook never
     disagrees with what the page's markup says. */
  const loadBoard = useCallback(async () => {
    try {
      const r = await fetch("/api/board?market=token", { cache: "no-store" });
      if (!r.ok) throw new Error(`board HTTP ${r.status}`);
      const b = await r.json();
      if (b?.error) throw new Error(b.error);
      setBoard(b);
      setReadError("");
    } catch (e) {
      setReadError(e?.message || String(e));
    }
  }, []);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  /* Balance and allowance, read over the RPC so a visitor with no wallet still sees what the
     taker would need. Allowance is what decides whether the approve step is needed at all. */
  const loadAsset = useCallback(async () => {
    if (!cfg?.token?.asset) return;
    try {
      const provider = new JsonRpcProvider(cfg.rpcUrl);
      const equity = new Contract(cfg.token.asset, equityAbi, provider);
      const [symbol, decimals] = await Promise.all([equity.symbol(), equity.decimals()]);
      const balance = account ? await equity.balanceOf(account) : 0n;
      const allowance = account ? await equity.allowance(account, cfg.token.venue) : 0n;
      setAsset({ symbol, decimals: Number(decimals), balance, allowance, address: cfg.token.asset });
    } catch (e) {
      setReadError(e?.shortMessage || e?.message || String(e));
    }
  }, [cfg, account]);

  useEffect(() => { loadAsset(); }, [loadAsset]);

  /* Refresh balances when a transaction lands, and keep a slow poll so a second browser
     taking the same listing is noticed. */
  useEffect(() => {
    const t = setInterval(() => { loadBoard(); loadAsset(); }, 25000);
    return () => clearInterval(t);
  }, [loadBoard, loadAsset]);

  async function signer() {
    const p = injected();
    if (!p) throw new Error("no EIP-1193 wallet in this browser");
    const provider = new BrowserProvider(p);
    return provider.getSigner();
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
        throw e;
      }
    }
  }

  async function connect() {
    const p = injected();
    if (!p) {
      step({ kind: "fail", label: "No EVM wallet found in this browser", detail: "Install OKX Wallet or any EIP-1193 wallet. Reading this market never needs one." });
      return;
    }
    try {
      const [addr] = await p.request({ method: "eth_requestAccounts" });
      setAccount(addr);
      setWallet(walletName());
      await ensureChain();
    } catch (e) {
      step({ kind: "fail", label: "Wallet connection refused", detail: e?.message || String(e) });
    }
  }

  /* Every write shows its own step: pending → confirmed with the block, or refused with the
     contract's reason, which stays on screen. */
  async function run(key, label, fn) {
    setBusy(key);
    const id = step({ kind: "pending", label, detail: "waiting for confirmation…" });
    try {
      const tx = await fn();
      const rc = await tx.wait();
      patchStep(id, { kind: "ok", label: `${label} — confirmed`, detail: `block ${rc.blockNumber}`, hash: rc.hash });
      return true;
    } catch (e) {
      patchStep(id, {
        kind: "fail",
        label: `${label} — refused`,
        detail: e?.shortMessage || e?.reason || e?.message || String(e),
      });
      return false;
    } finally {
      setBusy("");
      loadBoard();
      loadAsset();
      /* The table above the button is server-rendered, so a confirmed write has to ask the
         server for the route again or the row would still read "Listed" after it was taken. */
      router.refresh();
    }
  }

  /* The whole take, in the order the contracts require it:
     mint the shortfall (faucet) → approve the market for the bond → take the listing. */
  async function takeListing(job) {
    if (!cfg?.token) return;
    const decimals = asset?.decimals ?? 18;
    const bond = BigInt(job.requiredBondToTake?.wei ?? 0);
    const price = BigInt(job.pricePerUnit?.wei ?? 0);
    const remaining = BigInt(job.remainingUnits ?? 0);
    if (bond <= 0n) return;

    const needMint = mintFor(bond, decimals);
    if ((asset?.balance ?? 0n) < needMint) {
      const ok = await run(`mint ${job.id}`, `Mint ${formatUnits(needMint, decimals)} ${asset?.symbol || "tTSLA"} from the faucet`, async () => {
        const equity = new Contract(cfg.token.asset, equityAbi, await signer());
        return equity.mint(account, needMint);
      });
      if (!ok) return;
    }
    if ((asset?.allowance ?? 0n) < bond) {
      const ok = await run(`approve ${job.id}`, `Approve ${formatUnits(bond, decimals)} ${asset?.symbol || "tTSLA"} for the market`, async () => {
        const equity = new Contract(cfg.token.asset, equityAbi, await signer());
        return equity.approve(cfg.token.venue, bond);
      });
      if (!ok) return;
    }
    await run(`take ${job.id}`, `Take over ${remaining} units of job ${job.id} — bond ${formatUnits(bond, decimals)} ${asset?.symbol || "tTSLA"}, price ${formatUnits(price, decimals)} each`, async () => {
      const market = new Contract(cfg.token.venue, marketAbi, await signer());
      return market.takeObligation(job.id, bond);
    });
  }

  const listed = (board?.jobs || []).filter((j) => j.takeable);

  return {
    cfg, cfgError, account, wallet, chainOk, board, asset, readError, steps, busy,
    connect, takeListing, run, loadBoard, loadAsset, clearSteps, listed, ZERO,
  };
}
