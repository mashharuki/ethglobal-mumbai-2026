import assert from "node:assert/strict";
import {
  createRegistrationBackup,
  restoreRegistrationBackup,
} from "../src/profile/registration-backup.ts";
import {
  createRegistrationProof,
  restoreRegistrationPrivateMaterial,
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

const registration = await createRegistrationProof(request);
const result = registration.publicProof;
const claim = { ...request, root: result.root };
assert.deepEqual(Object.keys(registration), ["publicProof"]);
assert.equal(JSON.stringify(registration).includes("privateMaterial"), false);
assert.equal(JSON.stringify(result).includes("salts"), false);
const restored = await restoreRegistrationPrivateMaterial(
  JSON.parse(JSON.stringify(registration.privateMaterial)),
);
assert.deepEqual(restored, registration.privateMaterial);
assert.deepEqual(restored.profile, request.profile);
assert.equal(restored.salts.length, 7);
const backup = await createRegistrationBackup(
  restored,
  "synthetic registration backup passphrase",
);
assert.equal(backup.ok, true);
if (!backup.ok) throw new Error("Registration backup failed");
assert.equal(backup.data.includes("hobbies"), false);
assert.equal(backup.data.includes(restored.salts[0]), false);
const restoredBackup = await restoreRegistrationBackup(
  backup.data,
  "synthetic registration backup passphrase",
);
assert.equal(restoredBackup.ok, true);
if (restoredBackup.ok) assert.deepEqual(restoredBackup.data, restored);
assert.deepEqual(
  await restoreRegistrationBackup(
    backup.data,
    "incorrect synthetic passphrase",
  ),
  { ok: false, error: "INVALID_BACKUP" },
);
await assert.rejects(
  restoreRegistrationPrivateMaterial({ ...restored, salts: ["0"] }),
);
await assert.rejects(
  restoreRegistrationPrivateMaterial({ ...restored, root: "0x42" }),
);
await assert.rejects(
  restoreRegistrationPrivateMaterial({ ...restored, profileVersion: 2 }),
);
await assert.rejects(
  restoreRegistrationPrivateMaterial({
    ...restored,
    profile: { ...restored.profile, hobbies: ["h8"] },
  }),
);
assert.equal(result.publicInputs.length, 8);
assert.equal(await verifyRegistrationProof(result, claim), true);
const repeated = await createRegistrationProof(request);
assert.notEqual(repeated.publicProof.root, result.root);
assert.equal(
  await verifyRegistrationProof(repeated.publicProof, {
    ...claim,
    root: repeated.publicProof.root,
  }),
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
  "Synthetic registration proof verified; separate private material restored and tampering rejected\n",
);
