// Derives the ABI from the compiled contract rather than hand-copying it.
// The generated file is committed, so a fresh clone builds without Foundry installed.
import fs from "node:fs";
import path from "node:path";

const artifact = path.resolve(import.meta.dirname, "../../out/Spectral.sol/Spectral.json");
const out = path.resolve(import.meta.dirname, "../lib/abi.json");

if (!fs.existsSync(artifact)) {
  if (fs.existsSync(out)) {
    console.log("no fresh artifact; keeping the committed abi at", out);
    process.exit(0);
  }
  console.error("run `forge build` first:", artifact, "not found and no committed abi exists");
  process.exit(1);
}
const { abi } = JSON.parse(fs.readFileSync(artifact, "utf8"));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(abi, null, 1));
console.log(`abi synced: ${abi.length} entries -> ${out}`);
