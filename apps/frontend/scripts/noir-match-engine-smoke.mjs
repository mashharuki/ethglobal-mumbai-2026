import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  computeMatchCiphertextDigest,
  proveNoirMatchCircuit,
  verifyNoirMatchCircuit,
} from "../src/search/noir-match-engine.ts";

// Generate ignored TOML fixtures in separate processes so the Noir and BB.js
// module loaders used by the proof test start with a clean runtime.
for (const name of ["matching-a", "matching-b", "matching-result"]) {
  execFileSync(
    process.execPath,
    [
      "--experimental-strip-types",
      new URL(`./${name}-fixture.mjs`, import.meta.url).pathname,
    ],
    {
      stdio: "inherit",
    },
  );
}

const digestOnly = process.argv.includes("--digest-only");
const resultOnly = process.argv.includes("--result-only");
for (const [name, fixture] of [
  ["first", "matching"],
  ["second", "matching_b"],
  ["result", "matching_result"],
]) {
  const source = readFileSync(
    new URL(`../../../circuits/${fixture}/Prover.toml`, import.meta.url),
    "utf8",
  );
  if (!source.startsWith("# Synthetic fixture only.")) {
    throw new Error("Only generated synthetic fixtures are allowed");
  }
  const inputs = Object.fromEntries(
    source
      .split("\n")
      .filter((line) => line.includes(" = "))
      .map((line) => {
        const [key, value] = line.split(" = ", 2);
        return [key, JSON.parse(value)];
      }),
  );
  if (digestOnly && name !== "first") break;
  if (resultOnly && name !== "result") continue;
  const proof = digestOnly
    ? undefined
    : await proveNoirMatchCircuit(name, inputs);
  if (name === "first") {
    const ciphertexts = inputs.first_x.map((x, index) => ({
      first: {
        x: BigInt(x),
        y: BigInt(inputs.first_y[index]),
      },
      second: {
        x: BigInt(inputs.second_x[index]),
        y: BigInt(inputs.second_y[index]),
      },
    }));
    const digest = await computeMatchCiphertextDigest(
      BigInt(inputs.session_digest),
      BigInt(inputs.public_key_x),
      BigInt(inputs.public_key_y),
      ciphertexts,
    );
    if (
      digest !== BigInt(inputs.ciphertext_digest) ||
      (proof && digest !== proof.publicInputs[11])
    ) {
      throw new Error("Ciphertext digest does not match A proof");
    }
    const tamperedCiphertexts = ciphertexts.map((point, index) =>
      index === 0
        ? { ...point, first: { ...point.first, x: point.first.x + 1n } }
        : point,
    );
    if (
      (await computeMatchCiphertextDigest(
        BigInt(inputs.session_digest),
        BigInt(inputs.public_key_x),
        BigInt(inputs.public_key_y),
        tamperedCiphertexts,
      )) === digest
    ) {
      throw new Error("Modified ciphertext was accepted");
    }
  }
  if (digestOnly) {
    process.stdout.write(
      "first: ciphertext digest accepted; tampered ciphertext rejected\n",
    );
    break;
  }
  if (!proof) throw new Error("Missing generated proof");
  if (!(await verifyNoirMatchCircuit(name, proof))) {
    throw new Error(`${name} valid proof was rejected`);
  }
  const tampered = {
    ...proof,
    publicInputs: proof.publicInputs.map((value, index) =>
      index === 0 ? value + 1n : value,
    ),
  };
  if (await verifyNoirMatchCircuit(name, tampered)) {
    throw new Error(`${name} tampered public input was accepted`);
  }
  const falsifiedProof = new Uint8Array(proof.proof);
  falsifiedProof[Math.floor(falsifiedProof.length / 2)] ^= 1;
  if (await verifyNoirMatchCircuit(name, { ...proof, proof: falsifiedProof })) {
    throw new Error(`${name} falsified proof bytes were accepted`);
  }
  process.stdout.write(
    `${name}: real proof accepted; tampered input and proof bytes rejected\n`,
  );
}
