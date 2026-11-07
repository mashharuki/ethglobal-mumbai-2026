import { writeFileSync } from "node:fs";
import { Barretenberg, GRUMPKIN_G1_GENERATOR } from "@aztec/bb.js";
import { deriveVector } from "../../../circuits/oracle.ts";
import fixture from "../../../specs/001-private-dating/fixtures/scenarios.json" with {
  type: "json",
};

const fieldBytes = (value) =>
  Buffer.from(BigInt(value).toString(16).padStart(64, "0"), "hex");
const fieldValue = (value) => BigInt(`0x${Buffer.from(value).toString("hex")}`);
const pointValue = (point) => ({
  x: fieldValue(point.x),
  y: fieldValue(point.y),
});
const encodeField = (value) => `"0x${value.toString(16)}"`;
const api = await Barretenberg.new({ skipSrsInit: true });

try {
  const vectorResult = deriveVector(
    fixture.participants.A,
    "A",
    fixture.dictionary,
  );
  if (!vectorResult.ok) throw new Error(vectorResult.error);
  const publicKey = (
    await api.grumpkinMul({
      point: GRUMPKIN_G1_GENERATOR,
      scalar: fieldBytes(17),
    })
  ).point;
  const key = pointValue(publicKey);
  const firstX = [];
  const firstY = [];
  const secondX = [];
  const secondY = [];
  let digest = await api.pedersenHash({
    inputs: [9101n, 73n, key.x, key.y].map(fieldBytes),
    hashIndex: 0,
  });

  for (let index = 0; index < 288; index += 1) {
    const randomness = BigInt(index + 1);
    const first = (
      await api.grumpkinMul({
        point: GRUMPKIN_G1_GENERATOR,
        scalar: fieldBytes(randomness),
      })
    ).point;
    const masked = (
      await api.grumpkinMul({
        point: publicKey,
        scalar: fieldBytes(randomness),
      })
    ).point;
    const second =
      vectorResult.data[index] === 1
        ? (
            await api.grumpkinAdd({
              pointA: masked,
              pointB: GRUMPKIN_G1_GENERATOR,
            })
          ).point
        : masked;
    const firstValue = pointValue(first);
    const secondValue = pointValue(second);
    firstX.push(firstValue.x);
    firstY.push(firstValue.y);
    secondX.push(secondValue.x);
    secondY.push(secondValue.y);
    digest = await api.pedersenHash({
      inputs: [
        fieldValue(digest.hash),
        firstValue.x,
        firstValue.y,
        secondValue.x,
        secondValue.y,
      ].map(fieldBytes),
      hashIndex: 0,
    });
  }

  const lines = [
    "# Synthetic fixture only. All scalar values below are public test data.",
    "hobbies = [1, 1, 0, 0, 0, 0, 0, 0]",
    "gender = [1, 0, 0]",
    "intent = [1, 0]",
    "accepts_gender = [0, 1, 0]",
    "accepts_intent = [0, 1]",
    "job = 201",
    "age_band = 301",
    "salts = [11, 12, 13, 14, 15, 16, 17]",
    "secret_key = 17",
    `randomness = [${Array.from({ length: 288 }, (_, index) => index + 1).join(", ")}]`,
    `first_x = [${firstX.map(encodeField).join(", ")}]`,
    `first_y = [${firstY.map(encodeField).join(", ")}]`,
    `second_x = [${secondX.map(encodeField).join(", ")}]`,
    `second_y = [${secondY.map(encodeField).join(", ")}]`,
    "schema_version = 1",
    "dictionary_version = 1",
    "subject_lo = 41",
    "subject_hi = 0",
    "issuance_lo = 51",
    "issuance_hi = 0",
    "profile_version = 1",
    'root = "0x105c14d1f8f4dc5e31a9277a47489ed9dac4fc16515c6f3eefdf16ebd6f9cc2d"',
    "session_digest = 73",
    `public_key_x = ${encodeField(key.x)}`,
    `public_key_y = ${encodeField(key.y)}`,
    `ciphertext_digest = ${encodeField(fieldValue(digest.hash))}`,
  ];
  writeFileSync(
    new URL("../../../circuits/matching/Prover.toml", import.meta.url),
    `${lines.join("\n")}\n`,
  );
  process.stdout.write(
    "Wrote synthetic A-side ciphertext fixture (288 coordinates)\n",
  );
} finally {
  await api.destroy();
}
