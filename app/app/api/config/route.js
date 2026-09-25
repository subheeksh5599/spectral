// Serves the chain and market configuration from the environment. Every chain value comes
// from env: the client never hardcodes a chain id, RPC, explorer or contract address.
//
// `markets` is the list the page renders and signs against — a native-value market, and
// however many ERC-20 markets this deployment is configured for. The legacy `token` field
// is kept for the ERC-20 market the second board has always addressed, so nothing that
// already reads this endpoint breaks.
import { chainInfo, listMarkets } from "../../../lib/market-config";

const REQUIRED = [
  "CHAIN_ID",
  "CHAIN_NAME",
  "RPC_URL",
  "EXPLORER_URL",
  "NATIVE_SYMBOL",
  "FAUCET_URL",
  "VENUE_ADDRESS",
];

export const dynamic = "force-dynamic";

export async function GET() {
  const missing = REQUIRED.filter((k) => !process.env[k]);
  if (missing.length) {
    return Response.json(
      { error: "missing env: " + missing.join(", ") + " (no defaults — the app must know which chain it is talking to)" },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const markets = listMarkets();
  const firstErc20 = markets.find((m) => m.kind === "erc20") || null;

  return Response.json(
    {
      ...chainInfo(),
      venue: process.env.VENUE_ADDRESS,
      markets,
      /* The second market is optional: a deployment that only runs the native-value market
         advertises no token addresses rather than inventing them. When they are present the
         page can sign against that market too, which is the difference between showing it
         and supporting it. */
      token: firstErc20
        ? { venue: firstErc20.venue, asset: firstErc20.asset, symbol: firstErc20.symbol }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
