import React from "react";

/* Toast host: pending → confirmed (with an explorer link) → gone, or failed and
   it stays until dismissed. A failed write never disappears on its own. */
export default function Toasts({ txs, dismissTx, cfg }) {
  if (!txs?.length) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {txs.map((t) => (
        <div className={`toast${t.kind === "fail" ? " danger" : ""}`} key={t.id}>
          <div className="head">
            {t.kind === "pending" && <span className="spin" aria-hidden="true" />}
            {t.kind === "ok" && <span className="tick" aria-hidden="true">✓</span>}
            {t.kind === "fail" && <span className="cross" aria-hidden="true">✕</span>}
            <span>{t.label}</span>
          </div>
          {t.detail && <div className="why">{t.detail}</div>}
          <div className="acts">
            {t.hash && cfg && (
              <a className="btn xs secondary" href={`${cfg.explorerUrl}/tx/${t.hash}`} target="_blank" rel="noreferrer">
                View on explorer ↗
              </a>
            )}
            <button className="btn xs ghost" onClick={() => dismissTx(t.id)}>
              {t.kind === "pending" ? "Hide" : "Dismiss"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
