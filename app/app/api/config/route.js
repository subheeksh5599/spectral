// Serves the chain configuration from the environment. Every chain value comes from env:
// the client never hardcodes a chain id, RPC, explorer or contract address.
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

  return Response.json(
    {
      chainId: Number(process.env.CHAIN_ID),
      chainIdHex: "0x" + Number(process.env.CHAIN_ID).toString(16),
      chainName: process.env.CHAIN_NAME,
      rpcUrl: process.env.RPC_URL,
      explorerUrl: process.env.EXPLORER_URL,
      nativeSymbol: process.env.NATIVE_SYMBOL,
      faucetUrl: process.env.FAUCET_URL,
      venue: process.env.VENUE_ADDRESS,
      startBlock: Number(process.env.START_BLOCK || 0),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
