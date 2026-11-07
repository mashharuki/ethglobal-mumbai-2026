import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath, URL } from "node:url";
import {
  credentialReferenceSchema,
  participationCredentialSchema,
  participationTrustSchema,
} from "shared";

import { prepareParticipationRevision } from "./revision.ts";

const evidenceRoot = new URL(
  "../../../../specs/001-private-dating/evidence/",
  import.meta.url,
);
function loadEvidence(filename: string): unknown {
  return JSON.parse(
    readFileSync(fileURLToPath(new URL(filename, evidenceRoot)), "utf8"),
  );
}

const signedEvidence = loadEvidence("ens-alice-credential-signed.json");
const referenceEvidence = loadEvidence("ens-alice-reference.json");
const previous = participationCredentialSchema.parse(
  typeof signedEvidence === "object" &&
    signedEvidence !== null &&
    "credential" in signedEvidence
    ? signedEvidence.credential
    : null,
);
const reference = credentialReferenceSchema.parse(
  typeof referenceEvidence === "object" &&
    referenceEvidence !== null &&
    "reference" in referenceEvidence
    ? referenceEvidence.reference
    : null,
);
const trust = participationTrustSchema.parse(loadEvidence("ens-trust.json"));
const observedAt = 1794500000n;

function makeInput() {
  return {
    previous,
    currentReference: reference,
    trust,
    currentOwner: previous.subject,
    currentIssuanceId: previous.issuanceId,
    observedAt,
    action: { type: "suspend" as const, until: 1794503600 },
  };
}

describe("participation credential revisions", () => {
  it("should prepare a finite version 2 suspension when the signed current credential is valid", async () => {
    const result = await prepareParticipationRevision(makeInput());
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.credentialVersion, 2);
    assert.equal(result.data.status, "suspended");
    assert.equal(result.data.suspendedUntil, 1794503600);
    assert.equal(result.data.issuanceId, previous.issuanceId);
    assert.equal("signature" in result.data, false);
  });

  it("should prepare an eligible revision with no suspension deadline", async () => {
    const result = await prepareParticipationRevision({
      ...makeInput(),
      action: { type: "restore" },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.credentialVersion, 2);
    assert.equal(result.data.status, "eligible");
    assert.equal(result.data.suspendedUntil, null);
  });

  it("should reject an old credential after the ENS reference advances", async () => {
    const result = await prepareParticipationRevision({
      ...makeInput(),
      currentReference: { ...reference, credentialVersion: 2 },
    });
    assert.deepEqual(result, { ok: false, error: "REFERENCE_MISMATCH" });
  });

  it("should reject a reissued ENS name with a new issuance ID", async () => {
    const result = await prepareParticipationRevision({
      ...makeInput(),
      currentIssuanceId: `0x${"0".repeat(64)}`,
    });
    assert.deepEqual(result, { ok: false, error: "ISSUANCE_MISMATCH" });
  });

  it("should reject a forged issuer in the prior credential", async () => {
    const result = await prepareParticipationRevision({
      ...makeInput(),
      previous: { ...previous, issuer: previous.subject },
    });
    assert.deepEqual(result, { ok: false, error: "SIGNATURE_INVALID" });
  });

  it("should reject a suspension that has expired or exceeds credential validity", async () => {
    const expired = await prepareParticipationRevision({
      ...makeInput(),
      action: { type: "suspend", until: Number(observedAt) },
    });
    const tooLong = await prepareParticipationRevision({
      ...makeInput(),
      action: { type: "suspend", until: previous.expiresAt + 1 },
    });
    assert.deepEqual(expired, { ok: false, error: "INVALID_SUSPENSION" });
    assert.deepEqual(tooLong, { ok: false, error: "INVALID_SUSPENSION" });
  });

  it("should reject a credential at its expiration timestamp", async () => {
    const result = await prepareParticipationRevision({
      ...makeInput(),
      observedAt: BigInt(previous.expiresAt),
    });
    assert.deepEqual(result, { ok: false, error: "CREDENTIAL_EXPIRED" });
  });
});
