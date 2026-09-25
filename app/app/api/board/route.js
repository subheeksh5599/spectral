/* GET /api/board — the obligation board as JSON.
 *
 * Read-only, keyless, no login: whatever can make an HTTP request can ask this market
 * who is owed what right now, which obligations are takeable, and what bond taking one
 * costs. The heavy lifting is in lib/board.mjs, which the venue UI does not use — this
 * route and the CLI are the two thin shells around it.
 *
 * Query parameters:
 *   ?job=6        one job
 *   ?state=Listed only jobs in one of Open|Stalled|Listed|Taken|Settled|Closed
 *
 * Chain values come from the environment, the same variables /api/config serves, so the
 * endpoint cannot drift from the deployment the venue renders.
 */
import abi from "../../../lib/abi.json";
import { readBoard } from "../../../lib/board.mjs";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const need = ["RPC_URL", "VENUE_ADDRESS"];
  const missing = need.filter((k) => !process.env[k]);
  if (missing.length) {
    return Response.json({ error: "missing env: " + missing.join(", ") }, { status: 500 });
  }

  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const job = url.searchParams.get("job");

  try {
    const board = await readBoard({
      rpcUrl: process.env.RPC_URL,
      venue: process.env.VENUE_ADDRESS,
      abi,
      explorerUrl: process.env.EXPLORER_URL || "",
      nativeSymbol: process.env.NATIVE_SYMBOL || "OKB",
      chainId: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : null,
      chainName: process.env.CHAIN_NAME || "",
      job: job === null ? null : Number(job),
      state,
    });
    return Response.json(board, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
    });
  } catch (e) {
    return Response.json(
      { error: "board read failed", detail: e?.shortMessage || e?.message || String(e) },
      { status: 502 },
    );
  }
}
