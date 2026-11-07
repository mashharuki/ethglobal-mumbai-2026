import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Barretenberg } from "@aztec/bb.js";
import { checkMatchProofContext } from "../../../packages/shared/src/matching/context.ts";

const VK_HASHES = {
  a: "629107f9a38859e0460efe80439e93a979f1e1dd105ba0f584c3557775ddecf1",
  b: "669ee65e6f780d055d8e9469bf3c31d2ec5f9c6524e8dec257e29b4d1fc40da7",
  result: "b7cbf302fac9e7ebd45a92bed7b285c6759bda9aad571ae49c195cf7a16999d0",
};

const [bbBinary, aDirectory, bDirectory, resultDirectory, contextPath] =
  process.argv.slice(2);
if (!bbBinary || !aDirectory || !bDirectory || !resultDirectory) {
  throw new Error(
    "Usage: node verify-matching.mjs <bb-v6-bin> <A-proof-dir> <B-proof-dir> <result-proof-dir> [trusted-context.json]",
  );
}

function readVerifiedFields(directory, expectedHash, count) {
  const vk = readFileSync(join(directory, "vk"));
  const digest = createHash("sha256").update(vk).digest("hex");
  if (digest !== expectedHash)
    throw new Error("Unexpected circuit verification key");
  execFileSync(
    bbBinary,
    [
      "verify",
      "-p",
      join(directory, "proof"),
      "-k",
      join(directory, "vk"),
      "-i",
      join(directory, "public_inputs"),
    ],
    { stdio: "pipe" },
  );
  const input = readFileSync(join(directory, "public_inputs"));
  if (input.length !== count * 32)
    throw new Error("Unexpected public-input length");
  return Array.from({ length: count }, (_, index) =>
    BigInt(`0x${input.subarray(index * 32, (index + 1) * 32).toString("hex")}`),
  );
}

const a = readVerifiedFields(aDirectory, VK_HASHES.a, 12);
const b = readVerifiedFields(bDirectory, VK_HASHES.b, 16);
const result = readVerifiedFields(resultDirectory, VK_HASHES.result, 10);
if (a[0] !== 1n || a[1] !== 1n || b[0] !== 1n || b[1] !== 1n) {
  throw new Error("Unsupported schema or dictionary version");
}
for (const index of [8, 9, 10, 11]) {
  if (a[index] !== b[index])
    throw new Error("A/B session or ciphertext differs");
}
const transcriptIndices = [8, 11, 9, 10];
for (let index = 0; index < 4; index += 1) {
  if (b[transcriptIndices[index]] !== result[index])
    throw new Error("Result transcript differs from B proof");
  if (b[12 + index] !== result[4 + index])
    throw new Error("Result ciphertext differs from B proof");
}
if (result[9] !== 0n && result[9] !== 1n)
  throw new Error("Result is not one bit");
if (contextPath) {
  const context = JSON.parse(readFileSync(contextPath, "utf8"));
  const checked = checkMatchProofContext(
    context,
    { a, b, result },
    Math.floor(Date.now() / 1000),
  );
  if (!checked.ok)
    throw new Error(`Matching context rejected: ${checked.error}`);
}

const api = await Barretenberg.new({ skipSrsInit: true });
try {
  const values = [9102n, ...result.slice(0, 8)];
  const inputs = values.map((value) =>
    Buffer.from(value.toString(16).padStart(64, "0"), "hex"),
  );
  const digest = await api.pedersenHash({ inputs, hashIndex: 0 });
  if (BigInt(`0x${Buffer.from(digest.hash).toString("hex")}`) !== result[8]) {
    throw new Error("Result transcript digest mismatch");
  }
} finally {
  await api.destroy();
}

process.stdout.write(
  `Verified ${contextPath ? "provided-context" : "synthetic unbound"} matching result: ${result[9] === 1n ? "compatible" : "incompatible"}\n`,
);
