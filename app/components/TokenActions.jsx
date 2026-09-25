"use client";

/* The second market's signer path, next to its read-only table.
 *
 * The table above says what the market holds; this says what a visitor can do about it, which
 * for a listed obligation is exactly one thing: take it over by bonding at least half of what
 * is left. Because the bond here is an ERC-20 rather than native value, the button does the
 * three steps the contracts require and shows each one — mint the shortfall from the replica's
 * open faucet, approve the market for the bond, take the listing — so a refusal can be read
 * rather than guessed at.
 */
import { useState } from "react";
import { formatUnits } from "ethers";
import { shortAddr } from "../lib/venue";
import { useTokenVenue } from "../lib/token-venue";

export default function TokenActions() {
  const v = useTokenVenue();
  const [open, setOpen] = useState(false);

  if (v.cfgError) {
    return (
      <p className="text-sm text-ink-muted mt-6">
        Signing for this market is unavailable on this deployment: {v.cfgError}
      </p>
    );
  }

  const decimals = v.asset?.decimals ?? 18;
  const amt = (wei) => {
    const s = formatUnits(wei ?? 0n, decimals);
    return Number(s) === 0 ? "0" : Number(s).toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  };
  const sym = v.asset?.symbol || v.cfg?.token?.symbol || "tTSLA";
  const listed = v.listed || [];

  return (
    <div className="mt-6 border-t border-ink-charcoal/10 pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="label-caps text-ink-muted">take one over — this market signs too</span>
        {v.account ? (
          <span className="text-sm text-ink-charcoal">
            {shortAddr(v.account)} · {amt(v.asset?.balance)} {sym}
            {v.asset?.allowance > 0n ? ` · ${amt(v.asset.allowance)} ${sym} already approved` : ""}
          </span>
        ) : (
          <button className="pc-pill ghost" disabled={!!v.busy} onClick={v.connect}>
            Connect a wallet to take a listing
          </button>
        )}
        {listed.length > 0 && (
          <button className="pc-pill ghost sm" onClick={() => setOpen((o) => !o)}>
            {open ? "Hide the calls" : "What the button sends"}
          </button>
        )}
      </div>

      {listed.length === 0 && (
        <p className="text-sm text-ink-muted mt-3">
          Nothing is listed on this market right now. When something is, the take appears here: the
          contract asks a bond of half the remainder, and whoever posts it buys the uncounted units at
          the job's own price.
        </p>
      )}

      {listed.map((j) => (
        <div key={j.id} className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="pc-pill primary"
            disabled={!!v.busy || !v.account}
            onClick={() => v.takeListing(j)}
          >
            Take over {j.remainingUnits} units of job #{j.id} · bond {amt(BigInt(j.requiredBondToTake?.wei ?? 0))} {sym}
          </button>
          <span className="text-sm text-ink-muted">
            pays {amt(BigInt(j.pricePerUnit?.wei ?? 0))} {sym} per unit — {amt(BigInt(j.escrow?.wei ?? 0))} {sym} is
            escrowed for {j.remainingUnits} uncounted units
          </span>
          {!v.account && (
            <span className="text-sm text-ink-muted">connect first: this one is signed, not scripted</span>
          )}
        </div>
      ))}

      {open && listed.length > 0 && (
        <pre className="mt-4 overflow-x-auto rounded-xl bg-paper-white p-4 text-xs leading-6 text-ink-charcoal">
{`# 1. the replica has an open faucet, so the shortfall can be minted here
equity.mint(you, ${amt(BigInt(listed[0].requiredBondToTake?.wei ?? 0))} ${sym})   # only if you hold less than the bond

# 2. the market pulls the bond with transferFrom, so it needs an allowance
equity.approve(${v.cfg?.token?.venue}, ${amt(BigInt(listed[0].requiredBondToTake?.wei ?? 0))})

# 3. take the listing: the market takes the bond, the remainder becomes yours
market.takeObligation(${listed[0].id}, ${amt(BigInt(listed[0].requiredBondToTake?.wei ?? 0))})`}
        </pre>
      )}

      {v.steps.length > 0 && (
        <div className="mt-5 flex flex-col gap-3">
          {v.steps.map((s) => (
            <div key={s.id} className={`pc-toast${s.kind === "fail" ? " failed" : ""}`} role="status" aria-live="polite">
              <div className="flex items-center gap-3">
                {s.kind === "pending" && (
                  <span className="w-4 h-4 rounded-full border-2 border-ink-charcoal/20 border-t-brand-coral animate-spin" aria-hidden="true" />
                )}
                {s.kind === "ok" && <span className="w-6 h-6 rounded-full bg-brand-green grid place-items-center text-sm font-bold" aria-hidden="true">✓</span>}
                {s.kind === "fail" && <span className="w-6 h-6 rounded-full bg-brand-coral text-white grid place-items-center text-sm font-bold" aria-hidden="true">✕</span>}
                <span className="text-[15px] font-semibold">{s.label}</span>
              </div>
              {s.detail && <p className="mt-2 text-sm leading-6 text-ink-muted break-all">{s.detail}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {s.hash && v.cfg && (
                  <a className="pc-pill sm ghost" href={`${v.cfg.explorerUrl}/tx/${s.hash}`} target="_blank" rel="noreferrer">
                    View on explorer ↗
                  </a>
                )}
              </div>
            </div>
          ))}
          {v.steps.length > 1 && (
            <button className="pc-pill sm ghost self-start" onClick={v.clearSteps}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
