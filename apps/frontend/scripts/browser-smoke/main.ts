import { Barretenberg, UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import matchingInput from "../../../../circuits/matching/Prover.toml?raw";
import matchingBInput from "../../../../circuits/matching_b/Prover.toml?raw";
import matchingResultInput from "../../../../circuits/matching_result/Prover.toml?raw";
import matchingCircuit from "../../../../circuits/target/matching.json";
import matchingBCircuit from "../../../../circuits/target/matching_b.json";
import matchingResultCircuit from "../../../../circuits/target/matching_result.json";

const cases = {
  matching: [matchingCircuit, matchingInput],
  matching_b: [matchingBCircuit, matchingBInput],
  matching_result: [matchingResultCircuit, matchingResultInput],
} as const;

const nativeFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const requested =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  const url = new URL(requested, location.href);
  if (["crs.aztec-cdn.foundation", "crs.aztec-labs.com"].includes(url.host)) {
    const file =
      url.pathname === "/g1_compressed.dat"
        ? "bn254_g1_compressed.dat"
        : url.pathname === "/g2.dat"
          ? "bn254_g2.dat"
          : url.pathname.slice(1);
    return nativeFetch(`/${file}`, init);
  }
  return nativeFetch(input, init);
};

const query = new URLSearchParams(location.search);
const name = query.get("circuit") ?? "matching";
if (!(name in cases)) throw new Error("Unknown matching circuit");
const [artifact, source] = cases[name as keyof typeof cases];
if (!source.startsWith("# Synthetic fixture only.")) {
  throw new Error("Only generated synthetic fixtures are allowed");
}
const circuit = { ...artifact, file_map: {}, debug_symbols: {} };
const inputs = Object.fromEntries(
  source
    .split("\n")
    .filter((line) => line.includes(" = "))
    .map((line) => {
      const [key, value] = line.split(" = ", 2);
      return [key, JSON.parse(value)];
    }),
);
const result = document.querySelector<HTMLPreElement>("#result");
const button = document.querySelector<HTMLButtonElement>("#run");
if (!result || !button) throw new Error("Missing smoke test UI");

button.addEventListener("click", async () => {
  button.disabled = true;
  result.textContent = "running";
  const start = performance.now();
  let api: Barretenberg | undefined;
  try {
    const noir = new Noir(circuit as ConstructorParameters<typeof Noir>[0]);
    const { witness } = await noir.execute(inputs);
    const witnessMs = performance.now() - start;
    api = await Barretenberg.new({
      threads: 1,
      srsSize: name === "matching_result" ? undefined : 2 ** 20,
    });
    const backend = new UltraHonkBackend(circuit.bytecode, api);
    const proof = await backend.generateProof(witness);
    const proveMs = performance.now() - start - witnessMs;
    const key = await backend.getVerificationKey();
    const isValid = await backend.verifyProof(proof);
    const totalMs = performance.now() - start;
    const digest = await crypto.subtle.digest("SHA-256", key);
    const keyHash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const usedHeap = (
      performance as Performance & { memory?: { usedJSHeapSize: number } }
    ).memory?.usedJSHeapSize;
    result.textContent = JSON.stringify({
      name,
      isValid,
      witnessMs: Math.round(witnessMs),
      proveMs: Math.round(proveMs),
      totalMs: Math.round(totalMs),
      proofBytes: proof.proof.length,
      publicInputs: proof.publicInputs.length,
      keyHash,
      usedJSHeapSize: usedHeap ?? null,
    });
  } catch (error) {
    result.textContent = `error: ${error instanceof Error ? error.message : String(error)}`;
  } finally {
    await api?.destroy();
  }
});
