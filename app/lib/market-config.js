/* The markets this deployment serves, resolved from the environment.
 *
 * One registry, used by /api/config, /api/board and the page, so a market cannot be
 * advertised on one surface and unknown on another. Nothing is guessed: a market appears
 * only if its address is in the environment, and an entry that is not configured is
 * absent rather than defaulted to something plausible.
 *
 * Two kinds exist, and the difference is real rather than cosmetic:
 *
 *   native — escrow and bonds are the chain's own coin, one transaction to take a listing.
 *   erc20  — escrow and bonds are an ERC-20, so the taker approves the market first; the
 *            asset decides the decimals every amount on screen is formatted with, and it
 *            decides whether a visitor who holds none can be handed some (faucet) or has
 *            to go and get it from the chain's own faucet.
 *
 * Adding a market is therefore an environment change, not a code change — which is the
 * point: the same page and the same contracts serve the market that escrows a replica
 * equity and the one that escrows the chain's own testnet dollar.
 */

function erc20(prefix, key) {
  const venue = process.env[`${prefix}_MARKET_ADDRESS`];
  if (!venue) return null;
  return {
    key,
    kind: "erc20",
    venue,
    asset: process.env[`${prefix}_ASSET_ADDRESS`] || null,
    symbol: process.env[`${prefix}_SYMBOL`] || key.toUpperCase(),
    /* true only where the asset itself can be minted by a visitor (the replica equity).
       Where it is false the console tells the visitor where to get the asset instead of
       offering a mint that would revert. */
    faucet: process.env[`${prefix}_ASSET_MINTABLE`] === "1",
    faucetUrl: process.env[`${prefix}_FAUCET_URL`] || process.env.FAUCET_URL || "",
  };
}

export function listMarkets() {
  const markets = [];

  if (process.env.VENUE_ADDRESS) {
    markets.push({
      key: "native",
      kind: "native",
      venue: process.env.VENUE_ADDRESS,
      asset: null,
      symbol: process.env.NATIVE_SYMBOL || "OKB",
      faucet: false,
      faucetUrl: process.env.FAUCET_URL || "",
    });
  }

  /* the ERC-20 markets, in the order they should be listed */
  for (const [prefix, key] of [
    ["TOKEN", "token"],
    ["TOKEN2", process.env.TOKEN2_KEY || "usdg"],
    ["TOKEN3", process.env.TOKEN3_KEY || "token3"],
  ]) {
    const m = erc20(prefix, key);
    if (m) markets.push(m);
  }

  return markets;
}

export function marketInfo(key) {
  const markets = listMarkets();
  if (!key) return markets[0] || null;
  return markets.find((m) => m.key === key) || null;
}

/* The chain every market in this deployment shares — served to the client so it never
   hardcodes a chain id, RPC or explorer. */
export function chainInfo() {
  return {
    chainId: Number(process.env.CHAIN_ID),
    chainIdHex: "0x" + Number(process.env.CHAIN_ID).toString(16),
    chainName: process.env.CHAIN_NAME,
    rpcUrl: process.env.RPC_URL,
    explorerUrl: process.env.EXPLORER_URL,
    nativeSymbol: process.env.NATIVE_SYMBOL,
    faucetUrl: process.env.FAUCET_URL,
    startBlock: Number(process.env.START_BLOCK || 0),
  };
}
