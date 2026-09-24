// Derives the ABI from the compiled contract rather than hand-copying it.
// Fails loudly if the contract has not been built.
import fs from "node:fs";
import path from "node:path";

const artifact = path.resolve(import.meta.dirname, "../../out/Spectral.sol/Spectral.json");
if (!fs.existsSync(artifact)) {
  console.error("run `forge build` first:", artifact, "not found");
  process.exit(1);
}
const { abi } = JSON.parse(fs.readFileSync(artifact, "utf8"));
const out = path.resolve(import.meta.dirname, "../src/abi.json");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(abi, null, 1));
console.log(`abi synced: ${abi.length} entries -> ${out}`);
