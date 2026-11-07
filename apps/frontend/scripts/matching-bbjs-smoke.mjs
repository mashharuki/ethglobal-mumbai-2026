import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";

const circuitName = process.argv[2] ?? "matching";
if (!["matching", "matching_b", "matching_result"].includes(circuitName)) {
  throw new Error("Unknown matching circuit");
}
const circuit = JSON.parse(
  readFileSync(
    new URL(`../../../circuits/target/${circuitName}.json`, import.meta.url),
    "utf8",
  ),
);
delete circuit.file_map;
delete circuit.debug_symbols;
const source = readFileSync(
  new URL(`../../../circuits/${circuitName}/Prover.toml`, import.meta.url),
  "utf8",
);
const inputs = Object.fromEntries(
  source
    .split("\n")
    .filter((line) => line.includes(" = "))
    .map((line) => {
      const [name, value] = line.split(" = ", 2);
      return [name, JSON.parse(value)];
    }),
);
const noir = new Noir(circuit);
const { witness } = await noir.execute(inputs);
const api = await Barretenberg.new({ threads: 1 });
try {
  const backend = new UltraHonkBackend(circuit.bytecode, api);
  const proof = await backend.generateProof(witness);
  const key = await backend.getVerificationKey();
  if (!(await backend.verifyProof(proof))) {
    throw new Error("BB.js proof verification failed");
  }
  process.stdout.write(
    `${circuitName} BB.js proof valid: ${proof.proof.length} bytes, ${proof.publicInputs.length} public inputs, VK sha256 ${createHash("sha256").update(key).digest("hex")}\n`,
  );
} finally {
  await api.destroy();
}
