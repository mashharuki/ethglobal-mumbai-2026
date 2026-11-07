import { readFileSync, writeFileSync } from "node:fs";
import { Barretenberg } from "@aztec/bb.js";
import { checkCandidate } from "../../../circuits/oracle.ts";
import fixture from "../../../specs/001-private-dating/fixtures/scenarios.json" with {
  type: "json",
};

const source = readFileSync(
  new URL("../../../circuits/matching_b/Prover.toml", import.meta.url),
  "utf8",
);
const readValue = (name) => {
  const match = source.match(new RegExp(`^${name} = (.+)$`, "m"));
  if (!match) throw new Error(`Missing B fixture value: ${name}`);
  return JSON.parse(match[1]);
};
const fieldBytes = (value) =>
  Buffer.from(BigInt(value).toString(16).padStart(64, "0"), "hex");
const fieldValue = (value) => BigInt(`0x${Buffer.from(value).toString("hex")}`);
const encodeField = (value) => `"0x${BigInt(value).toString(16)}"`;
const api = await Barretenberg.new({ skipSrsInit: true });
const scenarioId = process.env.MATCHING_SCENARIO ?? "all-conditions";
const scenario = fixture.matchingCases.find(({ id }) => id === scenarioId);
if (!scenario) throw new Error(`Unknown matching scenario: ${scenarioId}`);
const profileA = { ...fixture.participants.A, ...scenario.overrides?.A };
const profileB = { ...fixture.participants.B, ...scenario.overrides?.B };

try {
  const first = {
    x: fieldBytes(readValue("output_first_x")),
    y: fieldBytes(readValue("output_first_y")),
  };
  const shared = (
    await api.grumpkinMul({ point: first, scalar: fieldBytes(17) })
  ).point;
  const isZero =
    fieldValue(shared.x) === BigInt(readValue("output_second_x")) &&
    fieldValue(shared.y) === BigInt(readValue("output_second_y"));
  const compatible = !isZero;
  const oracle = checkCandidate(profileA, profileB, fixture.dictionary);
  if (!oracle.ok || oracle.data !== compatible)
    throw new Error("Encrypted result differs from oracle");
  const transcriptValues = [
    9102,
    readValue("session_digest"),
    readValue("ciphertext_digest"),
    readValue("public_key_x"),
    readValue("public_key_y"),
    readValue("output_first_x"),
    readValue("output_first_y"),
    readValue("output_second_x"),
    readValue("output_second_y"),
  ];
  const digest = fieldValue(
    (
      await api.pedersenHash({
        inputs: transcriptValues.map(fieldBytes),
        hashIndex: 0,
      })
    ).hash,
  );
  const lines = [
    "# Synthetic fixture only. A's private key is a public test value.",
    "secret_key = 17",
    `session_digest = ${readValue("session_digest")}`,
    `ciphertext_digest = ${encodeField(readValue("ciphertext_digest"))}`,
    `public_key_x = ${encodeField(readValue("public_key_x"))}`,
    `public_key_y = ${encodeField(readValue("public_key_y"))}`,
    `output_first_x = ${encodeField(readValue("output_first_x"))}`,
    `output_first_y = ${encodeField(readValue("output_first_y"))}`,
    `output_second_x = ${encodeField(readValue("output_second_x"))}`,
    `output_second_y = ${encodeField(readValue("output_second_y"))}`,
    `transcript_digest = ${encodeField(digest)}`,
    `compatible = ${compatible}`,
  ];
  writeFileSync(
    new URL("../../../circuits/matching_result/Prover.toml", import.meta.url),
    `${lines.join("\n")}\n`,
  );
  process.stdout.write(
    `Wrote synthetic result fixture: compatible=${compatible}\n`,
  );
} finally {
  await api.destroy();
}
