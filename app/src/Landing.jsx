import React, { useMemo } from "react";
import { useVenue, STATES, STATE_TONE, shortAddr, asNum } from "./venue.js";
import Toasts from "./Toasts.jsx";

const ago = (ms) => {
  if (!ms) return "–";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)} min ago`;
};

export default function Landing() {
  const v = useVenue();
  const { cfg, cfgError, stats, jobs, chainOk, loading, readError, lastReadAt } = v;

  const preview = useMemo(() => jobs.slice(0, 4), [jobs]);

  if (cfgError) {
    return (
      <div className="shell" style={{ padding: "48px 24px" }}>
        <div className="alert danger">
          <b>Refusing to run without chain configuration.</b> {cfgError}
          {" "}Required: CHAIN_ID, CHAIN_NAME, RPC_URL, EXPLORER_URL, NATIVE_SYMBOL, FAUCET_URL, VENUE_ADDRESS.
          There are no defaults in the code, so this app can never quietly talk to the wrong chain.
        </div>
      </div>
    );
  }

  const unit = cfg?.nativeSymbol || "";

  return (
    <>
      <div className="shell">
        <nav className="nav">
          <a className="wordmark" href="/"><span className="mark">ob</span>Obligo</a>
          <div className="navlinks">
            <a className="navlink" href="#how">How it settles</a>
            <a className="navlink" href="#board">Live board</a>
            <a className="navlink" href="#questions">Questions</a>
          </div>
          <span className="spacer" />
          {cfg && (
            <span className={`badge ${chainOk === false ? "danger" : "neutral"}`}>
              <span className={`dot ${chainOk === false ? "danger" : "neutral"}`} />
              {cfg.chainName} · {cfg.chainId}
            </span>
          )}
          <a className="btn" href="/app">Open the venue</a>
        </nav>

        <section className="hero">
          <div>
            <p className="eyebrow">Onchain work settlement · countable units</p>
            <h1 className="display-xl" style={{ marginTop: 16 }}>Unfinished work, still payable.</h1>
            <p className="lede">
              A job is a set of countable units. When the executor stops, the units it never
              counted are listed, another party takes them over against a bond, and settlement
              is arithmetic over what was counted. No oracle, no jury, no admin key.
            </p>
            <div className="hero-actions">
              <a className="btn xl" href="/app">Open the venue</a>
              <a className="btn xl secondary" href={cfg?.faucetUrl} target="_blank" rel="noreferrer">Get testnet {unit}</a>
            </div>
            <p className="caption" style={{ marginTop: 16 }}>
              {loading ? "Reading the contract…" : `${jobs.length} job${jobs.length === 1 ? "" : "s"} on ${shortAddr(cfg?.venue)} · read from the chain at render time`}
            </p>
          </div>

          <div className="hero-panel">
            <div className="rowkv">
              <span className="k">Units counted</span>
              <span className="v">{stats.counted} / {stats.units}</span>
            </div>
            <div className="meter"><i style={{ width: `${stats.pct}%` }} /></div>
            <div className="rowkv" style={{ marginTop: 12 }}>
              <span className="k">Jobs settled</span>
              <span className="v">{stats.settled}</span>
            </div>
            <div className="rowkv">
              <span className="k">Closed by rule</span>
              <span className="v">{stats.closed}</span>
            </div>
            <div className="rowkv">
              <span className="k">Escrow still locked</span>
              <span className="v">{asNum(stats.locked)} {unit}</span>
            </div>
            <div className="rowkv">
              <span className="k">Obligations live</span>
              <span className="v">{stats.live}</span>
            </div>
          </div>
        </section>

        {/* the page's one loud idea: a hairline band carrying live chain numbers */}
        <div className="statband">
          <div>
            <div className="label">Units counted</div>
            <div className="value">{stats.counted}</div>
            <div className="foot">of {stats.units} registered across every job</div>
          </div>
          <div>
            <div className="label">Obligations taken over</div>
            <div className="value">{jobs.filter((j) => j.taker !== "0x0000000000000000000000000000000000000000").length}</div>
            <div className="foot">unfinished work assumed by a second party</div>
          </div>
          <div>
            <div className="label">Settled / closed by rule</div>
            <div className="value">{stats.settled} / {stats.closed}</div>
            <div className="foot">arithmetic decided, not a human</div>
          </div>
          <div>
            <div className="label">Venue</div>
            <div className="value small">{cfg ? shortAddr(cfg.venue) : "…"}</div>
            <div className="foot">{chainOk === false ? "wrong network in wallet" : "public testnet, no admin"}</div>
          </div>
        </div>

        <div className="section-head" id="how">
          <h2 className="headline">How it settles</h2>
          <p className="caption">Three rules, no discretion anywhere in between.</p>
        </div>
        <div className="steps">
          <div>
            <span className="step-num">01</span>
            <h3>The units are escrowed</h3>
            <p>Escrow must equal units × price exactly, so no rounding dust can exist anywhere in the system.</p>
          </div>
          <div>
            <span className="step-num">02</span>
            <h3>The executor stops</h3>
            <p>Whatever it counted stays theirs. The rest becomes a listed obligation instead of a refund.</p>
          </div>
          <div>
            <span className="step-num">03</span>
            <h3>A taker finishes it</h3>
            <p>Against a bond of at least half the remaining escrow. Miss the deadline and the bond goes to the buyer, by rule.</p>
          </div>
        </div>

        <div className="section-head" id="board">
          <h2 className="headline">The board, as the chain has it</h2>
          <p className="caption">
            {readError ? "read failed — see below" : `updated ${ago(lastReadAt)}`}
          </p>
        </div>
        {readError && (
          <div className="alert danger" style={{ marginBottom: 16 }}>
            <b>Could not read the venue.</b> {readError} <button className="btn sm secondary" onClick={() => v.load()}>Retry</button>
          </div>
        )}
        {loading ? (
          <div className="rows"><div className="skeleton" /><div className="skeleton" /><div className="skeleton" /></div>
        ) : preview.length === 0 ? (
          <div className="empty">
            <div className="tile">◻</div>
            <h3>No job has been opened yet</h3>
            <p>Opening one escrows units × price against a named executor and a deadline.</p>
            <a className="btn lg" href="/app">Open the first job</a>
          </div>
        ) : (
          <div className="rows">
            <div className="row-head">
              <span>Job</span><span>State</span><span>Executor</span>
              <span className="num">Counted</span><span className="num">Left</span>
              <span className="num">Escrow</span><span>Deadline</span>
            </div>
            {preview.map((j) => (
              <div className="row" key={j.id}>
                <span className="tnum">#{j.id}</span>
                <span><span className={`badge ${STATE_TONE[STATES[j.state]]}`}><span className={`dot ${STATE_TONE[STATES[j.state]]}`} />{STATES[j.state]}</span></span>
                <span className="addr">{shortAddr(j.executor)}</span>
                <span className="num tnum">{j.executorUnits + j.takerUnits}</span>
                <span className="num tnum">{j.totalUnits - j.executorUnits - j.takerUnits}</span>
                <span className="num tnum">{asNum(j.escrow, 6)} {unit}</span>
                <span className="caption">{new Date(j.workDeadline * 1000).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
        <p className="caption" style={{ marginTop: 12 }}>
          Every row above is read from the contract when this page renders. Nothing is seeded, cached or mocked.
        </p>

        <div className="faq" id="questions">
          <div>
            <h2 className="headline">The honest questions</h2>
            <p className="subtle body-sm" style={{ marginTop: 12 }}>
              These are limits, stated rather than hidden.
            </p>
          </div>
          <div>
            <details className="qa"><summary>How does the contract know the work was really done?</summary>
              <p>It does not judge quality. It counts per-unit receipts and refuses a second attempt at the same index. Whether a receipt corresponds to good work is the buyer's acceptance rule — stated as a limit, not hidden.</p></details>
            <details className="qa"><summary>Why would a taker take on someone else's unfinished job?</summary>
              <p>Because the remainder is worth more to whoever is cheaper at doing it, and their bond is their own money at risk if they are wrong.</p></details>
            <details className="qa"><summary>What stops a taker from taking the job and stalling?</summary>
              <p>The deadline rule. They are paid only for units they actually counted, and their bond moves to the buyer. There is no dispute to file and no jury to persuade.</p></details>
            <details className="qa"><summary>Is this a fork of something bigger?</summary>
              <p>No — it is a deliberately narrow slice: matching by listing, settlement by arithmetic, fully collateralised, with no leverage and therefore no margin engine to liquidate.</p></details>
            <details className="qa"><summary>What is not finished?</summary>
              <p>Source verification on the explorer, a hosted URL, the recorded demo, and participation by anyone outside this build. All four are listed as pending in the repository's status file.</p></details>
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="shell">
          <div className="cols">
            <div className="brand">
              <a className="wordmark" href="/"><span className="mark">ob</span>Obligo</a>
              <p>The obligation outlives the agent. Settlement is arithmetic over counted units, and every number here is read from the chain.</p>
            </div>
            <div className="links">
              <div>
                <div className="label">Venue</div>
                <a href={`${cfg?.explorerUrl}/address/${cfg?.venue}`} target="_blank" rel="noreferrer">Contract ↗</a>
                <a href="/app">Open the venue</a>
                <a href="#questions">Limits</a>
              </div>
              <div>
                <div className="label">Chain</div>
                <a href={cfg?.faucetUrl} target="_blank" rel="noreferrer">Faucet ↗</a>
                <a href={cfg?.explorerUrl} target="_blank" rel="noreferrer">Explorer ↗</a>
                <a href="/api/config">Served config</a>
              </div>
            </div>
          </div>
          <div className="bottom">
            <span className="mono">{cfg ? cfg.venue : ""}</span>
            <span className="fresh">
              <span className={`statusdot ${chainOk === false ? "warn" : ""}`} />
              {chainOk === false ? "wallet on a different network" : `read OK · updated ${ago(lastReadAt)}`}
            </span>
          </div>
        </div>
      </footer>

      <Toasts txs={v.txs} dismissTx={v.dismissTx} cfg={cfg} />
    </>
  );
}
