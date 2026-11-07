import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { bytes, str, u64 } from "@arkiv-network/sdk/schema";
import {
  credentialReferenceSchema,
  participationCredentialSchema,
  participationTrustSchema,
} from "shared";
import { verifyPublicationReadback } from "./publication.ts";
import { prepareParticipationRevision } from "./revision.ts";
import {
  prepareRevisionReferenceAfterReadback,
  prepareSignedRevisionPublication,
} from "./revision-flow.ts";

const evidenceRoot = new URL(
  "../../../../specs/001-private-dating/evidence/",
  import.meta.url,
);
function loadEvidence(filename: string): unknown {
  return JSON.parse(readFileSync(new URL(filename, evidenceRoot), "utf8"));
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

function makeInput() {
  return {
    previous,
    currentReference: reference,
    trust,
    currentOwner: previous.subject,
    currentIssuanceId: previous.issuanceId,
    observedAt: 1794500000n,
    action: { type: "suspend" as const, until: 1794503600 },
  };
}

describe("issuer-side participation revision flow", () => {
  it("should reject the old signed version before creating an Arkiv write plan", async () => {
    const result = await prepareSignedRevisionPublication({
      ...makeInput(),
      signedRevision: previous,
    });
    assert.deepEqual(result, { ok: false, error: "REVISION_MISMATCH" });
  });

  it("should reject a version 2 body carrying the old signature", async () => {
    const draft = await prepareParticipationRevision(makeInput());
    assert.equal(draft.ok, true);
    if (!draft.ok) return;
    const result = await prepareSignedRevisionPublication({
      ...makeInput(),
      signedRevision: { ...draft.data, signature: previous.signature },
    });
    assert.deepEqual(result, { ok: false, error: "SIGNATURE_INVALID" });
  });

  it("should reject a stale current ENS reference before publication", async () => {
    const result = await prepareSignedRevisionPublication({
      ...makeInput(),
      currentReference: { ...reference, credentialVersion: 2 },
      signedRevision: previous,
    });
    assert.deepEqual(result, { ok: false, error: "REFERENCE_MISMATCH" });
  });

  it("should reject a changed issuance before publication", async () => {
    const result = await prepareSignedRevisionPublication({
      ...makeInput(),
      currentIssuanceId: `0x${"0".repeat(64)}`,
      signedRevision: previous,
    });
    assert.deepEqual(result, { ok: false, error: "ISSUANCE_MISMATCH" });
  });

  it("should withhold the ENS update until a valid new signature and readback exist", async () => {
    const result = await prepareRevisionReferenceAfterReadback({
      ...makeInput(),
      signedRevision: previous,
      row: {
        $key: reference.arkivEntityKey as `0x${string}`,
        $owner: trust.issuer as `0x${string}`,
        $creator: trust.issuer as `0x${string}`,
        $creationFlags: {
          readonly: true,
          permissionlessExtension: false,
          raw: 1,
        },
        issuance_id: str(previous.issuanceId),
        credential_version: u64(1n),
        record_digest: str(reference.digest),
        media_type: str("application/json"),
        content: bytes(new Uint8Array()),
      },
      resolver: "0x28a0549e48190d69Ae8Bf6046713F766B20A5598",
    });
    assert.deepEqual(result, { ok: false, error: "REVISION_MISMATCH" });
  });

  it("should accept issuer-owned immutable Arkiv readback and reject altered provenance", async () => {
    const row = {
      $key: reference.arkivEntityKey as `0x${string}`,
      $owner: trust.issuer as `0x${string}`,
      $creator: trust.issuer as `0x${string}`,
      $creationFlags: {
        readonly: true,
        permissionlessExtension: false,
        raw: 1,
      },
      issuance_id: str(previous.issuanceId),
      credential_version: u64(1n),
      record_digest: str(reference.digest),
      media_type: str("application/json"),
      content: bytes(new TextEncoder().encode(JSON.stringify(previous))),
    };
    const valid = await verifyPublicationReadback(
      row,
      reference,
      trust,
      1794500000n,
    );
    const alteredCreator = await verifyPublicationReadback(
      { ...row, $creator: previous.subject as `0x${string}` },
      reference,
      trust,
      1794500000n,
    );
    const mutable = await verifyPublicationReadback(
      {
        ...row,
        $creationFlags: {
          readonly: false,
          permissionlessExtension: false,
          raw: 0,
        },
      },
      reference,
      trust,
      1794500000n,
    );
    assert.equal(valid.ok, true);
    assert.deepEqual(alteredCreator, {
      ok: false,
      error: "REFERENCE_MISMATCH",
    });
    assert.deepEqual(mutable, { ok: false, error: "REFERENCE_MISMATCH" });
  });
});
