import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ExpirationTime } from "@arkiv-network/sdk";
import { bytes, str, u64 } from "@arkiv-network/sdk/schema";

import {
  deriveIssuanceId,
  participationTrustAnchor,
  participationTrustSchema,
} from "shared";

import {
  createCredentialReference,
  type ParticipationPublicationRow,
  ParticipationPublications,
  type PreparedParticipationPublication,
  prepareParticipationPublication,
  verifyPublicationReadback,
} from "./publication.ts";

const registry = "0x1111111111111111111111111111111111111111";
const transactionHash = `0x${"a".repeat(64)}`;
const trust = participationTrustSchema.parse({
  ...participationTrustAnchor,
  participantRegistry: registry,
  participantRegistryCodeHash: `0x${"b".repeat(64)}`,
  resolverImplementationCodeHash: `0x${"c".repeat(64)}`,
});

function makeCredential() {
  return {
    schemaVersion: 1,
    chainId: 11155111,
    registry,
    issuer: participationTrustAnchor.issuer,
    subject: "0x3333333333333333333333333333333333333333",
    dnsName: "alice.secrettinder.eth",
    issuanceId: deriveIssuanceId(11155111, registry, transactionHash, 0),
    issuanceEvent: { transactionHash, logIndex: 0 },
    credentialVersion: 1,
    status: "eligible",
    expiresAt: 2000,
    policyVersion: 1,
    accessTier: "new",
    suspendedUntil: null,
    signature: `0x${"d".repeat(130)}`,
  };
}

describe("Arkiv participation publication", () => {
  it("should reject an untrusted issuer before preparing a write", async () => {
    const result = await prepareParticipationPublication(
      {
        ...makeCredential(),
        issuer: "0x4444444444444444444444444444444444444444",
      },
      trust,
      1000n,
    );
    assert.deepEqual(result, { ok: false, error: "ISSUER_MISMATCH" });
  });

  it("should reject an expired credential before preparing a write", async () => {
    const result = await prepareParticipationPublication(
      makeCredential(),
      trust,
      2000n,
    );
    assert.deepEqual(result, { ok: false, error: "CREDENTIAL_EXPIRED" });
  });

  it("should reject a credential that outlives the Arkiv publication", async () => {
    const result = await prepareParticipationPublication(
      { ...makeCredential(), expiresAt: 1000 + 30 * 86_400 },
      trust,
      1000n,
    );
    assert.deepEqual(result, {
      ok: false,
      error: "CREDENTIAL_EXPIRY_TOO_LONG",
    });
  });

  it("should require a 32-byte Arkiv entity key in the ENS reference", () => {
    const publication: PreparedParticipationPublication = {
      schema: ParticipationPublications,
      values: {
        issuance_id: `0x${"e".repeat(64)}`,
        credential_version: u64(1n),
        record_digest: `0x${"f".repeat(64)}`,
        media_type: "application/json",
        content: new Uint8Array([123, 125]),
      },
      options: {
        expiration: ExpirationTime.fromDays(30),
        flags: { readonly: true },
      },
      recordDigest: `0x${"f".repeat(64)}`,
      credentialVersion: 1,
    };
    const key = `0x${"1".repeat(64)}` as const;
    assert.equal(
      createCredentialReference(key, publication).arkivEntityKey,
      key,
    );
    assert.throws(() => createCredentialReference("0x1234", publication));
  });

  it("should reject a public entity owned by someone other than the issuer", async () => {
    const entityKey = `0x${"1".repeat(64)}` as const;
    const digest = `0x${"f".repeat(64)}` as const;
    const row: ParticipationPublicationRow = {
      $key: entityKey,
      $owner: "0x4444444444444444444444444444444444444444",
      $creator: participationTrustAnchor.issuer,
      $creationFlags: {
        readonly: true,
        permissionlessExtension: false,
        raw: 1,
      },
      issuance_id: str(`0x${"e".repeat(64)}`),
      credential_version: u64(1n),
      record_digest: str(digest),
      media_type: str("application/json"),
      content: bytes(
        new TextEncoder().encode(JSON.stringify(makeCredential())),
      ),
    };
    const reference = {
      schemaVersion: 1 as const,
      arkivEntityKey: entityKey,
      digest,
      credentialVersion: 1,
    };
    const result = await verifyPublicationReadback(
      row,
      reference,
      trust,
      1000n,
    );
    assert.deepEqual(result, { ok: false, error: "REFERENCE_MISMATCH" });
  });
});
