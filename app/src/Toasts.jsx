import React from "react";

/* Toast host on the same sheet of paper as the rest of the app: pending → confirmed
   with an explorer link → gone, or failed and it stays until dismissed. A failed write
   never disappears on its own. */
export default function Toasts({ txs, dismissTx, cfg }) {
  if (!txs?.length) return null;
  return (
    <div className="fixed right-5 bottom-5 z-50 flex w-[380px] max-w-[calc(100vw-2.5rem)] flex-col gap-3" role="status" aria-live="polite">
      {txs.map((t) => (
        <div key={t.id} className={`pc-toast${t.kind === "fail" ? " failed" : ""}`}>
          <div className="flex items-center gap-3">
            {t.kind === "pending" && (
              <span className="w-4 h-4 rounded-full border-2 border-ink-charcoal/20 border-t-brand-coral animate-spin" aria-hidden="true" />
            )}
            {t.kind === "ok" && <span className="w-6 h-6 rounded-full bg-brand-green grid place-items-center text-sm font-bold" aria-hidden="true">✓</span>}
            {t.kind === "fail" && <span className="w-6 h-6 rounded-full bg-brand-coral text-white grid place-items-center text-sm font-bold" aria-hidden="true">✕</span>}
            <span className="text-[15px] font-semibold">{t.label}</span>
          </div>

          {t.detail && <p className="mt-2 text-sm leading-6 text-ink-muted break-all">{t.detail}</p>}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {t.hash && cfg && (
              <a className="pc-pill sm ghost" href={`${cfg.explorerUrl}/tx/${t.hash}`} target="_blank" rel="noreferrer">
                View on explorer ↗
              </a>
            )}
            <button className="pc-pill sm ghost" onClick={() => dismissTx(t.id)}>
              {t.kind === "pending" ? "Hide" : "Dismiss"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
