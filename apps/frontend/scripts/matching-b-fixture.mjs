import { readFileSync, writeFileSync } from "node:fs";
import { Barretenberg, GRUMPKIN_G1_GENERATOR } from "@aztec/bb.js";
import { deriveVector } from "../../../circuits/oracle.ts";
import fixture from "../../../specs/001-private-dating/fixtures/scenarios.json" with {
  type: "json",
};

const source = readFileSync(
  new URL("../../../circuits/matching/Prover.toml", import.meta.url),
  "utf8",
);
const readValue = (name) => {
  const match = source.match(new RegExp(`^${name} = (.+)$`, "m"));
  if (!match) throw new Error(`Missing A fixture value: ${name}`);
  return JSON.parse(match[1]);
};
const fieldBytes = (value) =>
  Buffer.from(BigInt(value).toString(16).padStart(64, "0"), "hex");
const fieldValue = (value) => BigInt(`0x${Buffer.from(value).toString("hex")}`);
const encodeField = (value) => `"0x${value.toString(16)}"`;
const pointAt = (xs, ys, index) => ({
  x: fieldBytes(xs[index]),
  y: fieldBytes(ys[index]),
});
const api = await Barretenberg.new({ skipSrsInit: true });
const hasNoSharedHobby = process.env.MATCHING_SCENARIO === "no-shared-hobby";
const profileB = hasNoSharedHobby
  ? { ...fixture.participants.B, hobbies: ["h3"] }
  : fixture.participants.B;
const hobbyBits = hasNoSharedHobby
  ? [0, 0, 1, 0, 0, 0, 0, 0]
  : [0, 1, 1, 0, 0, 0, 0, 0];

try {
  const firstX = readValue("first_x");
  const firstY = readValue("first_y");
  const secondX = readValue("second_x");
  const secondY = readValue("second_y");
  const publicKey = {
    x: fieldBytes(readValue("public_key_x")),
    y: fieldBytes(readValue("public_key_y")),
  };
  const vectorResult = deriveVector(profileB, "B", fixture.dictionary);
  if (!vectorResult.ok) throw new Error(vectorResult.error);
  const selected = Array.from(vectorResult.data.keys()).filter(
    (index) => vectorResult.data[index] === 1,
  );
  if (selected.length === 0) throw new Error("Empty B selection");

  let sumFirst = pointAt(firstX, firstY, selected[0]);
  let sumSecond = pointAt(secondX, secondY, selected[0]);
  for (const index of selected.slice(1)) {
    sumFirst = (
      await api.grumpkinAdd({
        pointA: sumFirst,
        pointB: pointAt(firstX, firstY, index),
      })
    ).point;
    sumSecond = (
      await api.grumpkinAdd({
        pointA: sumSecond,
        pointB: pointAt(secondX, secondY, index),
      })
    ).point;
  }
  const maskedFirst = (
    await api.grumpkinMul({ point: sumFirst, scalar: fieldBytes(19) })
  ).point;
  const maskedSecond = (
    await api.grumpkinMul({ point: sumSecond, scalar: fieldBytes(19) })
  ).point;
  const rerandFirst = (
    await api.grumpkinMul({
      point: GRUMPKIN_G1_GENERATOR,
      scalar: fieldBytes(23),
    })
  ).point;
  const rerandSecond = (
    await api.grumpkinMul({ point: publicKey, scalar: fieldBytes(23) })
  ).point;
  const outputFirst = (
    await api.grumpkinAdd({ pointA: maskedFirst, pointB: rerandFirst })
  ).point;
  const outputSecond = (
    await api.grumpkinAdd({ pointA: maskedSecond, pointB: rerandSecond })
  ).point;

  const valueHash = async (values) =>
    fieldValue(
      (
        await api.pedersenHash({
          inputs: values.map(fieldBytes),
          hashIndex: 0,
        })
      ).hash,
    );
  const context = [1, 1, 42, 0, 52, 0, 1];
  const itemValues = [
    hobbyBits,
    [0, 1, 0],
    [0, 1],
    [1, 0, 0],
    [1, 0],
    [202],
    [302],
  ];
  const commitments = [];
  for (let index = 0; index < 7; index += 1) {
    commitments.push(
      await valueHash([
        101 + index,
        ...context,
        21 + index,
        await valueHash(itemValues[index]),
      ]),
    );
  }
  const root = await valueHash([9001, ...commitments]);

  const lines = [
    "# Synthetic fixture only. The scalars are public test data.",
    `hobbies = ${JSON.stringify(hobbyBits)}`,
    "gender = [0, 1, 0]",
    "intent = [0, 1]",
    "accepts_gender = [1, 0, 0]",
    "accepts_intent = [1, 0]",
    "job = 202",
    "age_band = 302",
    "salts = [21, 22, 23, 24, 25, 26, 27]",
    `first_x = ${JSON.stringify(firstX)}`,
    `first_y = ${JSON.stringify(firstY)}`,
    `second_x = ${JSON.stringify(secondX)}`,
    `second_y = ${JSON.stringify(secondY)}`,
    "mask = 19",
    "rerandomness = 23",
    "schema_version = 1",
    "dictionary_version = 1",
    "subject_lo = 42",
    "subject_hi = 0",
    "issuance_lo = 52",
    "issuance_hi = 0",
    "profile_version = 1",
    `root = ${encodeField(root)}`,
    `session_digest = ${readValue("session_digest")}`,
    `public_key_x = ${encodeField(fieldValue(publicKey.x))}`,
    `public_key_y = ${encodeField(fieldValue(publicKey.y))}`,
    `ciphertext_digest = ${encodeField(BigInt(readValue("ciphertext_digest")))}`,
    `output_first_x = ${encodeField(fieldValue(outputFirst.x))}`,
    `output_first_y = ${encodeField(fieldValue(outputFirst.y))}`,
    `output_second_x = ${encodeField(fieldValue(outputSecond.x))}`,
    `output_second_y = ${encodeField(fieldValue(outputSecond.y))}`,
  ];
  writeFileSync(
    new URL("../../../circuits/matching_b/Prover.toml", import.meta.url),
    `${lines.join("\n")}\n`,
  );
  process.stdout.write(
    `Wrote synthetic B-side masked ciphertext fixture (${selected.length} private selections)\n`,
  );
} finally {
  await api.destroy();
}
