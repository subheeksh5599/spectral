/* Which injected wallet signs.
 *
 * OKX Wallet injects itself as `window.okxwallet` *and* as `window.ethereum`, so a page
 * that only ever looks at `window.ethereum` cannot tell which wallet is in front of it,
 * and on a machine with two wallets installed it gets whichever won the injection race.
 * The order below puts OKX Wallet first when it is present and falls back to any other
 * EIP-1193 provider.
 *
 * Reading the venue never touches this file: reads go over the chain's RPC, so a visitor
 * with no wallet at all still sees real state. This is the signer path only.
 */
export function injected() {
  if (typeof window === "undefined") return undefined;
  return window.okxwallet || window.ethereum || undefined;
}

export function walletName() {
  if (typeof window === "undefined") return "";
  if (window.okxwallet) return "OKX Wallet";
  return window.ethereum ? "browser wallet" : "";
}
