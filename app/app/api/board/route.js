/* GET /api/board — the obligation board as JSON.
 *
 * Read-only, keyless, no login: whatever can make an HTTP request can ask this market
 * who is owed what right now, which obligations are takeable, and what bond taking one
 * costs. The heavy lifting is in lib/board.mjs, which the venue UI does not use — this
 * route and the CLI are the two thin shells around it.
 *
 * Query parameters:
 *   ?job=6              one job
 *   ?state=Listed       only jobs in one of Open|Stalled|Listed|Taken|Settled|Closed
 *   ?market=<key>       native | token | whatever else this deployment configures
 *
 * Chain values come from the environment, the same variables /api/config serves, so the
 * endpoint cannot drift from the deployment the venue renders. Each ERC-20 market is a
 * separate deployment with its own address and its own asset; they all expose the same
 * job shape, which is why one reader serves all of them.
 */
import abi from "../../../lib/abi.json";
import { readBoard, readDecimals } from "../../../lib/board.mjs";
import { listMarkets, marketInfo } from "../../../lib/market-config";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("market");

  const markets = listMarkets();
  const m = key ? marketInfo(key) : markets[0];

  if (!m) {
    return Response.json(
      { error: `no market "${key}" in this deployment`, available: markets.map((x) => x.key) },
      { status: 404 },
    );
  }

  const state = url.searchParams.get("state");
  const job = url.searchParams.get("job");

  try {
    const board = await readBoard({
      rpcUrl: process.env.RPC_URL,
      venue: m.venue,
      abi,
      explorerUrl: process.env.EXPLORER_URL || "",
      nativeSymbol: m.symbol,
      /* the divisor comes from the asset itself; a market whose asset cannot be read is
         reported as an error rather than rendered with a guessed divisor */
      decimals: m.asset ? await readDecimals(process.env.RPC_URL, m.asset) : 18,
      chainId: process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : null,
      chainName: process.env.CHAIN_NAME || "",
      job: job === null ? null : Number(job),
      state,
    });
    return Response.json(
      {
        ...board,
        market: m.key,
        kind: m.kind,
        asset: m.asset,
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
