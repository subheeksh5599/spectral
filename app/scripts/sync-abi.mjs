// Derives the ABIs from the compiled contracts rather than hand-copying them.
// The generated files are committed, so a fresh clone builds without Foundry installed.
//
// Three contracts, three surfaces:
//   Spectral      — the native-value market, what the venue page signs against
//   SpectralToken — the same state machine escrowing an ERC-20
//   TestnetEquity — the ERC-20 it escrows (faucet mint, approve, balanceOf)
import fs from "node:fs";
import path from "node:path";

const artifacts = [
  ["Spectral.sol/Spectral.json", "../lib/abi.json"],
  ["SpectralToken.sol/SpectralToken.json", "../lib/abi-token.json"],
  ["TestnetEquity.sol/TestnetEquity.json", "../lib/abi-equity.json"],
];

let missing = 0;
for (const [artifact, rel] of artifacts) {
  const src = path.resolve(import.meta.dirname, "../../out", artifact);
  const out = path.resolve(import.meta.dirname, rel);

  if (!fs.existsSync(src)) {
    // No fresh build: keep whatever is committed. A committed ABI is enough to build the app,
    // and it is the only way a fresh clone builds without Foundry.
    if (fs.existsSync(out)) {
      console.log(`no fresh artifact for ${artifact}; keeping the committed`, path.basename(out));
      continue;
    }
    console.error(`run \`forge build\` first: ${src} not found and no committed ${path.basename(out)} exists`);
    missing += 1;
    continue;
  }

  const { abi } = JSON.parse(fs.readFileSync(src, "utf8"));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(abi, null, 1));
  console.log(`abi synced: ${abi.length} entries -> ${out}`);
}

process.exit(missing ? 1 : 0);
