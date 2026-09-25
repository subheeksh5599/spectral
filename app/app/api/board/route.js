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
 *   ?market=token the ERC-20-denominated market instead of the native-value one
 *
 * Chain values come from the environment, the same variables /api/config serves, so the
 * endpoint cannot drift from the deployment the venue renders. The token market is a
 * separate deployment with its own address and its own asset symbol; both expose the same
 * job shape, which is why one reader serves both.
 */
import abi from "../../../lib/abi.json";
import { readBoard } from "../../../lib/board.mjs";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("market") === "token";

  const venue = token ? process.env.TOKEN_MARKET_ADDRESS : process.env.VENUE_ADDRESS;
  const symbol = token ? process.env.TOKEN_SYMBOL || "tTSLA" : process.env.NATIVE_SYMBOL || "OKB";

  const need = token
    ? ["RPC_URL", "TOKEN_MARKET_ADDRESS"]
    : ["RPC_URL", "VENUE_ADDRESS"];
  const missing = need.filter((k) => !process.env[k]);
  if (missing.length) {
    return Response.json({ error: "missing env: " + missing.join(", ") }, { status: 500 });
  }

  const state = url.searchParams.get("state");
  const job = url.searchParams.get("job");

  try {
    const board = await readBoard({
      rpcUrl: process.env.RPC_URL,
      venue,
      abi,
      explorerUrl: process.env.EXPLORER_URL || "",
      nativeSymbol: symbol,
      chainId: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : null,
      chainName: process.env.CHAIN_NAME || "",
      job: job === null ? null : Number(job),
      state,
    });
    return Response.json(
      {
        ...board,
        market: token ? "token" : "native",
        asset: token ? process.env.TOKEN_ASSET_ADDRESS || null : null,
      },
      { headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" } },
    );
  } catch (e) {
    return Response.json(
      { error: "board read failed", detail: e?.shortMessage || e?.message || String(e) },
      { status: 502 },
    );
  }
}
