// Serves the SPA and the chain configuration. Every chain value comes from the environment:
// the client never hardcodes a chain id, RPC, explorer or contract address.
import express from "express";
import path from "node:path";

const app = express();
const PORT = Number(process.env.PORT || 5173);

const REQUIRED = [
  "CHAIN_ID", "CHAIN_NAME", "RPC_URL", "EXPLORER_URL", "NATIVE_SYMBOL",
  "FAUCET_URL", "VENUE_ADDRESS",
];
const missing = REQUIRED.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(
    "refusing to start: missing env " + missing.join(", ") +
    "\n(no defaults — the app must know exactly which chain and contract it is talking to)"
  );
  process.exit(1);
}

app.get("/api/config", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({
    chainId: Number(process.env.CHAIN_ID),
    chainIdHex: "0x" + Number(process.env.CHAIN_ID).toString(16),
    chainName: process.env.CHAIN_NAME,
    rpcUrl: process.env.RPC_URL,
    explorerUrl: process.env.EXPLORER_URL,
    nativeSymbol: process.env.NATIVE_SYMBOL,
    faucetUrl: process.env.FAUCET_URL,
    venue: process.env.VENUE_ADDRESS,
    startBlock: Number(process.env.START_BLOCK || 0),
  });
});

const dist = path.resolve(import.meta.dirname, "dist");
app.use(express.static(dist));
app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));

app.listen(PORT, () => {
  console.log(`obligo app on http://127.0.0.1:${PORT}  (venue ${process.env.VENUE_ADDRESS}, chain ${process.env.CHAIN_ID})`);
});
