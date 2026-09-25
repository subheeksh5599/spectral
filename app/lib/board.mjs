/* The obligation board, read from the chain.
 *
 * One function, no framework, no Next, no React: whatever can reach an RPC endpoint can
 * ask this contract who is owed what right now. It is the same read the venue performs,
 * lifted out of the UI so another builder (or an agent) does not have to re-derive the
 * job tuple or the state numbering by reading Solidity.
 *
 * Read-only by construction: it takes an RPC URL and a contract address and returns
 * data. It holds no key, signs nothing, and writes nothing.
 *
 *   import { readBoard } from "./board.js";
 *   const board = await readBoard({ rpcUrl, venue, abi, explorerUrl, nativeSymbol });
 */

import { JsonRpcProvider, Contract, formatEther } from "ethers";

/* The contract's own state numbering (uint8 in the job tuple). */
export const STATES = ["Open", "Stalled", "Listed", "Taken", "Settled", "Closed"];
export const STATE_CODES = Object.fromEntries(STATES.map((s, i) => [s, i]));
/* A remainder is takeable exactly while the job sits in Listed. */
export const TAKEABLE_STATE = "Listed";

const trim = (s) => (s === "0.0" ? "0" : s.replace(/\.?0+$/, "") || "0");
const wei = (v, nativeSymbol) => ({ wei: (v ?? 0n).toString(), [nativeSymbol.toLowerCase()]: trim(formatEther(v ?? 0n)) });

export async function readBoard({
  rpcUrl,
  venue,
  abi,
  explorerUrl = "",
  nativeSymbol = "OKB",
  chainId = null,
  chainName = "",
  job = null,
  state = null,
} = {}) {
  if (!rpcUrl || !venue || !abi) throw new Error("readBoard needs rpcUrl, venue and abi");

  const provider = new JsonRpcProvider(rpcUrl);
  const net = await provider.getNetwork();
  const c = new Contract(venue, abi, provider);

  const count = Number(await c.jobCount());
  const ids = Array.from({ length: count }, (_, i) => i + 1);
  const raw = await Promise.all(ids.map((i) => c.jobs(i)));

  const jobs = await Promise.all(
    ids.map(async (id, k) => {
      const j = raw[k];
      const stateCode = Number(j[11]);
      const stateName = STATES[stateCode] ?? `Unknown(${stateCode})`;
      const totalUnits = Number(j[2]);
      const executorUnits = Number(j[5]);
      const takerUnits = Number(j[6]);
      const countedUnits = executorUnits + takerUnits;

      /* remainingUnits and requiredBond are contract functions, not arithmetic done here:
         a reader should get the contract's answer even if its bond rule ever changes. */
      let remaining = Math.max(0, totalUnits - countedUnits);
      try {
        remaining = Number(await c.remainingUnits(id));
      } catch { /* older or foreign deployment: fall back to the tuple arithmetic, labelled */ }
      let bondRequired = 0n;
      if (stateName === TAKEABLE_STATE) {
        try { bondRequired = await c.requiredBond(id); } catch { bondRequired = 0n; }
      }

      return {
        id,
        state: stateName,
        stateCode,
        takeable: stateName === TAKEABLE_STATE,
        buyer: j[0],
        executor: j[1],
        taker: j[9],
        totalUnits,
        executorUnits,
        takerUnits,
        countedUnits,
        remainingUnits: remaining,
        pricePerUnit: wei(j[3], nativeSymbol),
        escrow: wei(j[4], nativeSymbol),
        bond: wei(j[10], nativeSymbol),
        requiredBondToTake: wei(bondRequired, nativeSymbol),
        workDeadline: Number(j[7]),
        takerDeadline: Number(j[8]),
      };
    }),
  );

  /* newest first, the same order the venue renders */
  let rows = jobs.reverse();
  if (job != null) rows = rows.filter((r) => r.id === Number(job));
  if (state) rows = rows.filter((r) => r.state.toLowerCase() === String(state).toLowerCase());

  const live = rows.filter((r) => r.state === "Open" || r.state === "Stalled" || r.state === "Listed" || r.state === "Taken");
  const locked = live.reduce((a, r) => a + BigInt(r.escrow.wei) + BigInt(r.bond.wei), 0n);

  return {
    chain: {
      id: chainId ?? Number(net.chainId),
      name: chainName,
      venue,
      explorer: explorerUrl,
      nativeSymbol,
      readAt: new Date().toISOString(),
      blockNumber: await provider.getBlockNumber(),
    },
    totals: {
      jobs: rows.length,
      totalUnits: rows.reduce((a, r) => a + r.totalUnits, 0),
      countedUnits: rows.reduce((a, r) => a + r.countedUnits, 0),
      liveJobs: live.length,
      lockedInLiveJobs: wei(locked, nativeSymbol),
    },
    jobs: rows,
  };
}

/* Convenience for callers that only want the market's open supply of work. */
export async function readTakeable(opts = {}) {
  const board = await readBoard({ ...opts, state: TAKEABLE_STATE });
  return board.jobs;
}
