"use client";

/* Signing, for a market whose escrow and bonds are an ERC-20.
 *
 * The table above this file is server-rendered and reads only. This hook is what makes an
 * ERC-20 market something a visitor can ACT on rather than look at: the same escalation the
 * native market has — read with no wallet, sign with one — for a deployment whose units are
 * denominated in a token instead of the chain's own coin.
 *
 * Three differences from the native market drive the shape of this file:
 *
 *  1. Every movement of value is two transactions, not one: the market pulls escrow and bonds
 *     with transferFrom, so the wallet approves the market for the amount first. Approve and
 *     the action that spends it are awaited one after the other, because a call simulated
 *     against an unconfirmed approve reverts.
 *  2. The divisor is the ASSET's decimals, read from the token, never assumed. A 6-decimal
 *     dollar and an 18-decimal replica are both served correctly, and no amount on screen is
 *     formatted with a guessed divisor.
 *  3. Where the asset is mintable (the replica equity carries an open faucet) a visitor who
 *     holds none is handed some rather than sent away; where it is not (a real testnet dollar,
 *     issued by its own oracle-gated contract) the console says where to get it instead of
 *     offering a mint that would revert. `market.faucet` decides which of the two, and it is
 *     configuration, not a guess made here.
 *
 * Nothing here is simulated: every action lands as a signed transaction on the chain the
 * config names, and the board is re-read afterwards so the numbers on screen are the chain's.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserProvider, Contract, JsonRpcProvider, formatUnits, parseUnits, keccak256, toUtf8Bytes } from "ethers";
import marketAbi from "./abi-token.json";
import assetAbi from "./abi-equity.json";
import { injected, walletName } from "./wallet";

/* How much the faucet mints when a taker is short: the bond plus a tenth of margin, rounded
   up to a whole token. Small on purpose — a faucet, not a distribution. */
export function mintFor(bond, decimals) {
  if (!bond || bond <= 0n) return 0n;
  const raw = bond + bond / 10n;
  const unit = 10n ** BigInt(decimals);
  return ((raw + unit - 1n) / unit) * unit;
}

export function useMarketVenue(market) {
  const router = useRouter();
  const key = market?.key || "";
  const [cfg, setCfg] = useState(null);
  const [cfgError, setCfgError] = useState("");
  const [account, setAccount] = useState("");
  const [wallet, setWallet] = useState("");
  const [chainOk, setChainOk] = useState(null);
  const [board, setBoard] = useState(null);
  const [readError, setReadError] = useState("");
  const [asset, setAsset] = useState(null); // { symbol, decimals, balance, allowance }
  const [credits, setCredits] = useState(0n); // what this wallet can claim from this market
  const [busy, setBusy] = useState("");
  /* The inline lifecycle. Kept in sessionStorage because a confirmed write refreshes the
     server-rendered table, and a refresh must not erase the record of what was just signed —
     the visitor would lose the block numbers they need to check the very transaction that
     caused the refresh. */
  const STORE = key ? `spectral.steps.${key}` : "";
  const [steps, setSteps] = useState([]);
  const nextId = useRef(1);

  useEffect(() => {
    if (!STORE || typeof window === "undefined") return;
    try {
      const saved = JSON.parse(window.sessionStorage.getItem(STORE) || "[]");
      if (Array.isArray(saved) && saved.length) {
        setSteps(saved);
        nextId.current = saved.reduce((a, s) => Math.max(a, s.id || 0), 0) + 1;
      }
    } catch { /* a corrupt log is not worth an error banner: start empty */ }
  }, [STORE]);

  const persist = useCallback((list) => {
    if (!STORE || typeof window === "undefined") return;
    try { window.sessionStorage.setItem(STORE, JSON.stringify(list.slice(-25))); } catch { /* full or disabled */ }
  }, [STORE]);

  const step = useCallback((s) => {
    const id = nextId.current++;
    setSteps((list) => {
      const next = [...list, { id, ...s }];
      persist(next);
      return next;
    });
    return id;
  }, [persist]);
  const patchStep = useCallback((id, p) => {
    setSteps((list) => {
      const next = list.map((s) => (s.id === id ? { ...s, ...p } : s));
      persist(next);
      return next;
    });
  }, [persist]);
  const clearSteps = useCallback(() => {
    setSteps([]);
    if (STORE && typeof window !== "undefined") window.sessionStorage.removeItem(STORE);
  }, [STORE]);

  useEffect(() => {
    fetch("/api/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`config HTTP ${r.status}`))))
      .then((c) => {
        if (c?.error) throw new Error(c.error);
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
    if (!key) return;
    try {
      const r = await fetch(`/api/board?market=${encodeURIComponent(key)}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`board HTTP ${r.status}`);
      const b = await r.json();
      if (b?.error) throw new Error(b.error);
      setBoard(b);
      setReadError("");
    } catch (e) {
      setReadError(e?.message || String(e));
    }
  }, [key]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  /* Balance, allowance and claimable credits, read over the RPC so a visitor with no wallet
     still sees what the taker would need. Allowance is what decides whether the approve step
     is needed at all. */
  const loadAsset = useCallback(async () => {
    if (!cfg || !market?.asset) return;
    try {
      const provider = new JsonRpcProvider(cfg.rpcUrl);
      const token = new Contract(market.asset, assetAbi, provider);
      const [symbol, decimals] = await Promise.all([token.symbol(), token.decimals()]);
      const balance = account ? await token.balanceOf(account) : 0n;
      const allowance = account ? await token.allowance(account, market.venue) : 0n;
      setAsset({ symbol, decimals: Number(decimals), balance, allowance, address: market.asset });
      if (account) {
        const m = new Contract(market.venue, marketAbi, provider);
        setCredits(await m.credits(account));
      } else {
        setCredits(0n);
      }
    } catch (e) {
      setReadError(e?.shortMessage || e?.message || String(e));
    }
  }, [cfg, account, market]);

  useEffect(() => { loadAsset(); }, [loadAsset]);

  /* Refresh balances when a transaction lands, and keep a slow poll so a second browser
     working the same listing is noticed. */
  useEffect(() => {
    const t = setInterval(() => { loadBoard(); loadAsset(); }, 25000);
    return () => clearInterval(t);
  }, [loadBoard, loadAsset]);

  const decimals = asset?.decimals ?? 18;
  const symbol = asset?.symbol || market?.symbol || "";
  const fmt = useCallback((v) => formatUnits(v ?? 0n, decimals), [decimals]);
  const parse = useCallback((s) => parseUnits(String(s ?? "").trim(), decimals), [decimals]);

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

  /* A node that drops the answer to a receipt is not a refusal, and the page must not call it one.
     Ask for the receipt by hash before concluding anything: a transaction either is on chain or is
     not, and a `wait()` that times out has been wrong about which. A revert is the one case that
     arrives with a receipt attached, and that is a real refusal. */
  async function receiptFor(tx) {
    try {
      const rc = await tx.wait();
      return { receipt: rc };
    } catch (e) {
      if (e?.receipt) return { reverted: e };
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        try {
          const rc = await new JsonRpcProvider(cfg.rpcUrl).getTransactionReceipt(tx.hash);
          if (rc) return { receipt: rc };
        } catch { /* keep asking; a dropped answer is not an answer */ }
      }
      return { unconfirmed: true };
    }
  }

  /* Every write shows its own step: pending → confirmed with the block, sent-but-unconfirmed with
     its hash, or refused with the contract's reason. All three stay on screen. */
  async function run(key_, label, fn) {
    setBusy(key_);
    const id = step({ kind: "pending", label, detail: "waiting for confirmation…" });
    try {
      const tx = await fn();
      const out = await receiptFor(tx);
      if (out.receipt) {
        patchStep(id, { kind: "ok", label: `${label} — confirmed`, detail: `block ${out.receipt.blockNumber}`, hash: out.receipt.hash });
        return true;
      }
      if (out.unconfirmed) {
        /* Sent, and this page gave up waiting. Saying "refused" here would be false, and saying
           "confirmed" would be a guess: name the hash and point at the state that is authoritative. */
        patchStep(id, {
          kind: "sent",
          label: `${label} — sent, not confirmed here`,
          detail: `${cfg?.explorerUrl ? `${cfg.explorerUrl}/tx/${tx.hash}` : tx.hash} — the transaction is on chain; this page stopped waiting for its receipt, so the board above is what to trust`,
          hash: tx.hash,
        });
        return true;
      }
      throw out.reverted;
    } catch (e) {
      const raw = e?.shortMessage || e?.reason || e?.message || String(e);
      /* Some node answers arrive without a decodable reason. Rather than show the visitor a
         parser's complaint, say what is certainly true and point at the state that explains it. */
      const opaque = /missing revert data|invalid BigNumberish|could not decode result data|unknown custom error/i.test(raw);
      patchStep(id, {
        kind: "fail",
        label: `${label} — refused`,
        detail: opaque
          ? "the market refused this call and the node returned no reason; the board above shows the job's current state, which is usually why"
          : raw,
      });
      return false;
    } finally {
      setBusy("");
      loadBoard();
      loadAsset();
      /* The table above the console is server-rendered, so a confirmed write has to ask the
         server for the route again or the row would still read "Listed" after it was taken. */
      router.refresh();
      /* A node can answer a read from just before the transaction it just confirmed, which would
         leave a button offering a call the market has already moved past. Reading again a beat
         later costs nothing and closes that window. */
      for (const ms of [1500, 4000]) setTimeout(() => { loadBoard(); router.refresh(); }, ms);
    }
  }

  /* Approve the market for at least `amount`, only if the standing allowance is short. */
  async function ensureAllowance(amount, what) {
    if ((asset?.allowance ?? 0n) >= amount) return true;
    return run(`approve ${what}`, `Approve ${fmt(amount)} ${symbol} for the market`, async () => {
      const token = new Contract(market.asset, assetAbi, await signer());
      return token.approve(market.venue, amount);
    });
  }

  /* The whole take, in the order the contract requires it:
     mint the shortfall if the asset has a faucet → approve for the bond → take the listing. */
  async function takeListing(job) {
    const bond = BigInt(job.requiredBondToTake?.wei ?? 0);
    const price = BigInt(job.pricePerUnit?.wei ?? 0);
    const remaining = BigInt(job.remainingUnits ?? 0);
    if (bond <= 0n) return;

    if (market.faucet) {
      const need = mintFor(bond, decimals);
      if ((asset?.balance ?? 0n) < need) {
        const ok = await run(`mint ${job.id}`, `Mint ${fmt(need)} ${symbol} from the faucet`, async () => {
          const token = new Contract(market.asset, assetAbi, await signer());
          return token.mint(account, need);
        });
        if (!ok) return;
      }
    }
    if (!(await ensureAllowance(bond, `take ${job.id}`))) return;
    await run(`take ${job.id}`, `Take over ${remaining} units of job ${job.id} — bond ${fmt(bond)} ${symbol}, price ${fmt(price)} each`, async () => {
      const m = new Contract(market.venue, marketAbi, await signer());
      return m.takeObligation(job.id, bond);
    });
  }

  /* Open a job: the buyer escrows units × price, so the approve has to cover the whole
     escrow, not a bond. */
  async function openJob({ executor, units, price, minutes }) {
    /* A form that has not been filled in must not be reported as the market refusing this call: an
       empty field is a `BigInt("")` throw, which reads like a revert and is not one. Say what is
       missing and send nothing — the honest message is that nothing was submitted. */
    const who = String(executor ?? "").trim();
    const unitsStr = String(units ?? "").trim();
    const priceStr = String(price ?? "").trim();
    const minutesStr = String(minutes ?? "").trim();
    const missing =
      !/^0x[0-9a-fA-F]{40}$/.test(who) ? "the executor field needs an address (0x and 40 hex characters)"
        : !/^\d+$/.test(unitsStr) ? "the units field needs a whole number"
          : !/^\d+(\.\d+)?$/.test(priceStr) ? "the price per unit needs a number"
            : !/^\d+(\.\d+)?$/.test(minutesStr) || Number(minutesStr) <= 0 ? "the work window needs a number of minutes above zero"
              : "";
    if (missing) {
      step({ kind: "fail", label: "Open a job — nothing was sent", detail: `${missing}; no transaction was created` });
      return;
    }
    const unitsBig = BigInt(unitsStr);
    const ppu = parse(priceStr);
    const escrow = unitsBig * ppu;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(minutesStr) * 60);
    if (!(await ensureAllowance(escrow, "open a job"))) return;
    await run("create", `Escrow ${fmt(escrow)} ${symbol} for ${unitsBig} units`, async () => {
      const m = new Contract(market.venue, marketAbi, await signer());
      return m.createJob(executor, unitsBig, ppu, deadline);
    });
  }

  /* The rest of the lifecycle, one call each — the same five a shell script would send. */
  const countUnit = (job, index) => {
    const idxStr = String(index ?? "").trim();
    if (!/^\d+$/.test(idxStr)) {
      step({ kind: "fail", label: "Count a unit — nothing was sent", detail: "the unit index needs a whole number; no transaction was created" });
      return Promise.resolve(false);
    }
    return run(
      `count ${job.id}:${idxStr}`,
      `Count unit ${idxStr} of job ${job.id}`,
      async () => {
        const m = new Contract(market.venue, marketAbi, await signer());
        const receipt = keccak256(toUtf8Bytes(`receipt:${job.id}:${idxStr}:${Date.now()}`));
        return m.countUnit(job.id, BigInt(idxStr), receipt);
      },
    );
  };

  const declareStalled = (job) => run(
    `stall ${job.id}`, `Declare stall on job ${job.id}`,
    async () => {
      const m = new Contract(market.venue, marketAbi, await signer());
      return m.declareStalled(job.id);
    },
  );

  const listJob = (job, minutes) => run(
    /* The window the taker gets to finish in, defaulted to a day: a listing that lapses within the
       hour is not a listing, and the deadline is the one field a visitor is least likely to think
       about before pressing the button. */
    `list ${job.id}`, `List job ${job.id} for takeover`,
    async () => {
      const m = new Contract(market.venue, marketAbi, await signer());
      return m.listObligation(job.id, BigInt(Math.floor(Date.now() / 1000) + Number(minutes) * 60));
    },
  );

  const closeByRule = (job) => run(
    `close ${job.id}`, `Close job ${job.id} by rule`,
    async () => {
      const m = new Contract(market.venue, marketAbi, await signer());
      return m.closeFailed(job.id);
    },
  );

  const claimCredits = () => {
    if ((credits ?? 0n) <= 0n) return Promise.resolve(false);
    return run("claim", `Claim ${fmt(credits)} ${symbol}`, async () => {
      const m = new Contract(market.venue, marketAbi, await signer());
      return m.claim();
    });
  };

  const listed = (board?.jobs || []).filter((j) => j.takeable);

  return {
    cfg, cfgError, account, wallet, chainOk, board, asset, credits, readError, steps, busy,
    decimals, symbol, fmt, connect, takeListing, openJob, countUnit, declareStalled, listJob,
    closeByRule, claimCredits, run, loadBoard, loadAsset, clearSteps, listed,
  };
}
