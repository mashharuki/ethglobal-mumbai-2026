import assert from "node:assert/strict";
import {
  createRegistrationProof,
  verifyRegistrationProof,
} from "../src/proofs/register.ts";

const request = {
  subjectId: `0x${"00".repeat(31)}29`,
  issuanceId: `0x${"00".repeat(31)}33`,
  profileVersion: 1,
  profile: {
    hobbies: ["h1", "h2"],
    gender: "g1",
    intent: "i1",
    acceptsGenders: ["g2"],
    acceptsIntents: ["i2"],
    job: 201,
    ageBand: 301,
  },
};

const result = await createRegistrationProof(request);
const claim = { ...request, root: result.root };
assert.equal(result.publicInputs.length, 8);
assert.equal(await verifyRegistrationProof(result, claim), true);
const repeated = await createRegistrationProof(request);
assert.notEqual(repeated.root, result.root);
assert.equal(
  await verifyRegistrationProof(repeated, { ...claim, root: repeated.root }),
  true,
);
assert.equal(
  await verifyRegistrationProof(result, { ...claim, profileVersion: 2 }),
  false,
);
assert.equal(
  await verifyRegistrationProof(result, {
    ...claim,
    subjectId: `0x${"00".repeat(31)}2a`,
  }),
  false,
);
assert.equal(
  await verifyRegistrationProof({ ...result, root: "0x42" }, claim),
  false,
);
assert.equal(
  await verifyRegistrationProof(result, { ...claim, root: "0x42" }),
  false,
);
const changed = { ...result, proof: Uint8Array.from(result.proof) };
changed.proof[0] ^= 1;
assert.equal(await verifyRegistrationProof(changed, claim), false);
const changedKey = {
  ...result,
  verificationKey: Uint8Array.from(result.verificationKey),
};
changedKey.verificationKey[0] ^= 1;
assert.equal(await verifyRegistrationProof(changedKey, claim), false);
await assert.rejects(
  createRegistrationProof({
    ...request,
    profile: { ...request.profile, hobbies: ["unknown"] },
  }),
);
process.stdout.write(
  "Synthetic registration proof verified; fresh salts and rejection cases passed\n",
);
