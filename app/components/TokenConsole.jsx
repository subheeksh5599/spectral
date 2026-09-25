"use client";

/* The control room for one ERC-20-denominated market.
 *
 * The table next to this is the market's read: what it holds, who is owed what. This is the
 * same market's write surface — open a job (escrow), count a unit against a receipt, declare a
 * stall, list the remainder for takeover, take one over, close one that failed, and claim what
 * a wallet is owed. It is the five calls a shell script sends to run the lifecycle
 * (script/TokenMarket.s.sol), reachable from the page instead of from a terminal.
 *
 * Two things are read from the chain rather than assumed: the asset's decimals (every amount
 * on screen is formatted with them) and whether the asset is mintable by a visitor. Where it is
 * (the replica equity) a short wallet is offered a mint; where it is not (a real testnet dollar,
 * issued under its own rules) the console points at the chain's faucet instead of offering a
 * call that would revert.
 */
import { useState } from "react";
import { shortAddr } from "../lib/venue";
import { useMarketVenue } from "../lib/token-venue";

const stateTone = {
  Open: "bg-brand-green/15 text-ink-charcoal",
  Stalled: "bg-brand-lilac text-ink-charcoal",
  Listed: "bg-brand-coral/15 text-ink-charcoal",
  Taken: "bg-brand-green/15 text-ink-charcoal",
  Settled: "bg-paper-sand text-ink-muted",
  Closed: "bg-paper-sand text-ink-muted",
};

export default function TokenConsole({ market }) {
  const v = useMarketVenue(market);
  const [form, setForm] = useState({ executor: "", units: "4", price: "1", minutes: "30" });
  const [openForm, setOpenForm] = useState(false);
  const [unitIdx, setUnitIdx] = useState("0");
  const [listMin, setListMin] = useState("60");
  const [calls, setCalls] = useState(false);

  if (v.cfgError) {
    return (
      <p className="text-sm text-ink-muted mt-6">
        This deployment cannot sign for {market.key}: {v.cfgError}
      </p>
    );
  }

  const jobs = v.board?.jobs || [];
  const nowSec = Math.floor(Date.now() / 1000);
  const canClaim = (v.credits ?? 0n) > 0n;

  return (
    <div className="mt-6 border-t border-ink-charcoal/10 pt-5">
      {/* who is signing, and what they hold */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="label-caps text-ink-muted">run this market from here</span>
        {v.account ? (
          <span className="text-sm text-ink-charcoal">
            {shortAddr(v.account)} · {v.fmt(v.asset?.balance ?? 0n)} {v.symbol}
            {v.asset?.allowance > 0n ? ` · ${v.fmt(v.asset.allowance)} ${v.symbol} approved` : ""}
          </span>
        ) : (
          <button className="pc-pill ghost" disabled={!!v.busy} onClick={v.connect}>
            Connect a wallet
          </button>
        )}
        {v.account && v.asset && v.asset.balance === 0n && (
          <span className="text-sm text-ink-muted">
            {market.faucet ? (
              "no balance yet — the take button mints what it needs from the faucet"
            ) : (
              <>
                no balance yet — get testnet {v.symbol} from the{" "}
                <a className="underline decoration-brand-green" href={market.faucetUrl} target="_blank" rel="noreferrer">
                  chain&apos;s faucet ↗
                </a>
              </>
            )}
          </span>
        )}
        {canClaim && (
          <button className="pc-pill primary" disabled={!!v.busy} onClick={v.claimCredits}>
            Claim {v.fmt(v.credits)} {v.symbol}
          </button>
        )}
        <button className="pc-pill ghost sm" onClick={() => setCalls((c) => !c)}>
          {calls ? "Hide the calls" : "What each button sends"}
        </button>
      </div>

      {/* the actions, one row per job, decided by the state the chain reports */}
      <div className="mt-5 flex flex-col gap-3">
        {jobs.map((j) => {
          const past = j.state === "Taken" && j.takerDeadline > 0 && nowSec > j.takerDeadline;
          return (
            <div key={j.id} data-job={j.id} data-state={j.state} className="rounded-2xl bg-paper-white p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-ink-charcoal">#{j.id}</span>
                <span className={`label-caps px-2 py-1 rounded-full ${stateTone[j.state] || "bg-paper-sand"}`}>{j.state}</span>
                <span className="text-sm text-ink-muted">
                  {j.countedUnits}/{j.totalUnits} counted · {j.remainingUnits} left · {v.fmt(BigInt(j.escrow.wei))} {v.symbol} escrowed ·{" "}
                  {v.fmt(BigInt(j.pricePerUnit.wei))} {v.symbol}/unit
                </span>
                {j.state === "Taken" && (
                  <span className="text-sm text-ink-muted">
                    taker {shortAddr(j.taker)} · deadline {new Date(j.takerDeadline * 1000).toISOString().slice(0, 16)}Z
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {/* Counting is allowed exactly where the contract allows it: the executor while
                    the job is Open, the taker once it is Taken. Offering it on a stalled or
                    listed job would be offering a call the market refuses. */}
                {(j.state === "Open" || j.state === "Taken") && (
                  <>
                    <input
                      className="pc-input small w-[84px]"
                      value={unitIdx}
                      onChange={(e) => setUnitIdx(e.target.value.replace(/\D/g, ""))}
                      aria-label={`unit index for job ${j.id}`}
                    />
                    <button className="pc-pill ghost" disabled={!!v.busy || unitIdx === ""} onClick={() => v.countUnit(j, Number(unitIdx))}>
                      Count that unit
                    </button>
                  </>
                )}
                {(j.state === "Stalled" || j.state === "Listed") && (
                  <span className="text-xs text-ink-charcoal">
                    The remainder is frozen for a taker — counting resumes when a takeover starts.
                  </span>
                )}
                {j.state === "Open" && (
                  <button className="pc-pill ghost" disabled={!!v.busy} onClick={() => v.declareStalled(j)}>
                    Declare stall
                  </button>
                )}
                {j.state === "Stalled" && (
                  <>
                    <input
                      className="pc-input small w-[84px]"
                      value={listMin}
                      onChange={(e) => setListMin(e.target.value.replace(/\D/g, ""))}
                      aria-label={`taker window in minutes for job ${j.id}`}
                    />
                    <button className="pc-pill primary" disabled={!!v.busy || listMin === ""} onClick={() => v.listJob(j, Number(listMin))}>
                      List for takeover
                    </button>
                  </>
                )}
                {j.state === "Listed" && (
                  <button className="pc-pill primary" disabled={!!v.busy || !v.account} onClick={() => v.takeListing(j)}>
                    Take over {j.remainingUnits} units · bond {v.fmt(BigInt(j.requiredBondToTake.wei))} {v.symbol}
                  </button>
                )}
                {j.state === "Taken" && (
                  <button className="pc-pill ghost" disabled={!!v.busy} onClick={() => v.closeByRule(j)}>
                    {past ? "Close by rule — the taker missed the deadline" : "Close by rule"}
                  </button>
                )}
                {j.state === "Settled" && <span className="text-sm text-ink-muted">every unit counted and paid; nothing left to do</span>}
                {j.state === "Closed" && <span className="text-sm text-ink-muted">closed by rule; escrow refunded and the bond forfeited</span>}
              </div>
            </div>
          );
        })}
        {jobs.length === 0 && <p className="text-sm text-ink-muted">no jobs on this market yet — open the first one below</p>}
      </div>

      {/* open a job */}
      <div className="mt-5">
        <button className="pc-pill ghost" onClick={() => setOpenForm((o) => !o)}>
          {openForm ? "Cancel" : "Open a job on this market"}
        </button>
      </div>
      {openForm && (
        <div className="mt-4 rounded-2xl bg-paper-white p-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-sm text-ink-muted">
              executor
              <input
                className="pc-input small mt-1 w-full font-mono text-xs"
                placeholder="0x…"
                value={form.executor}
                onChange={(e) => setForm({ ...form, executor: e.target.value.trim() })}
              />
            </label>
            <label className="text-sm text-ink-muted">
              units
              <input className="pc-input small mt-1 w-full" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value.replace(/\D/g, "") })} />
            </label>
            <label className="text-sm text-ink-muted">
              price per unit ({v.symbol})
              <input className="pc-input small mt-1 w-full" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </label>
            <label className="text-sm text-ink-muted">
              work window (minutes)
              <input className="pc-input small mt-1 w-full" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value.replace(/\D/g, "") })} />
            </label>
          </div>
          <p className="mt-3 text-sm text-ink-muted">
            Escrow is units × price, and the market pulls it with transferFrom, so the button approves it first if the
            standing allowance is short.
          </p>
          <button
            className="pc-pill primary mt-4"
            disabled={!!v.busy || !v.account || !form.executor || !form.units || !form.price}
            onClick={() => v.openJob(form)}
          >
            Approve {v.account ? "" : "— connect first"}
            {v.account ? `${form.units || 0} × ${form.price || 0} ${v.symbol} and open` : ""}
          </button>
        </div>
      )}

      {calls && (
        <pre className="mt-4 overflow-x-auto rounded-xl bg-paper-white p-4 text-xs leading-6 text-ink-charcoal">
{`# every button above is one of these, in this order
asset.approve(${market.venue}, escrow)            # only if the allowance is short
market.createJob(executor, units, price, deadline)  # escrow = units * price
market.countUnit(jobId, index, keccak256(toUtf8Bytes("receipt:…")))
market.declareStalled(jobId)
market.listObligation(jobId, now + takerWindow)
market.takeObligation(jobId, requiredBond(jobId))   # approve the bond first
market.closeFailed(jobId)                           # after the taker deadline
market.claim()`}
        </pre>
      )}

      {/* the same lifecycle display the take has always had: pending → confirmed, or refused */}
      {v.steps.length > 0 && (
        <div className="mt-5 flex flex-col gap-3">
          {v.steps.map((s) => (
            <div key={s.id} className={`pc-toast${s.kind === "fail" ? " failed" : ""}`} role="status" aria-live="polite">
              <div className="flex items-center gap-3">
                {s.kind === "pending" && (
                  <span className="w-4 h-4 rounded-full border-2 border-ink-charcoal/20 border-t-brand-coral animate-spin" aria-hidden="true" />
                )}
                {s.kind === "ok" && <span className="w-6 h-6 rounded-full bg-brand-green grid place-items-center text-sm font-bold" aria-hidden="true">✓</span>}
                {s.kind === "sent" && <span className="w-6 h-6 rounded-full bg-brand-lilac grid place-items-center text-sm font-bold" aria-hidden="true">→</span>}
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
