import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  participationCredentialSchema,
  participationParentSnapshotSchema,
  participationTrustAnchor,
  participationTrustSchema,
} from "./schema.ts";

const baseCredential = {
  schemaVersion: 1,
  chainId: 11155111,
  registry: "0x1111111111111111111111111111111111111111",
  issuer: "0x2222222222222222222222222222222222222222",
  subject: "0x3333333333333333333333333333333333333333",
  dnsName: "a.example.eth",
  issuanceId: `0x${"a".repeat(64)}`,
  issuanceEvent: { transactionHash: `0x${"b".repeat(64)}`, logIndex: 0 },
  credentialVersion: 1,
  status: "eligible",
  expiresAt: 1794042000,
  policyVersion: 1,
  accessTier: "new",
  suspendedUntil: null,
  signature: `0x${"c".repeat(130)}`,
};

describe("participation credential", () => {
  it("should accept a synthetic eligible credential when fields are well formed", () => {
    assert.equal(
      participationCredentialSchema.safeParse(baseCredential).success,
      true,
    );
  });

  it("should require a finite deadline when suspended", () => {
    const input = { ...baseCredential, status: "suspended" };
    assert.equal(participationCredentialSchema.safeParse(input).success, false);
  });

  it("should accept a finite suspension deadline", () => {
    const input = {
      ...baseCredential,
      status: "suspended",
      suspendedUntil: baseCredential.expiresAt - 1,
    };
    assert.equal(participationCredentialSchema.safeParse(input).success, true);
  });

  it("should reject private case data in a public credential", () => {
    const input = { ...baseCredential, caseId: "private-case" };
    assert.equal(participationCredentialSchema.safeParse(input).success, false);
  });

  it("should reject a credential from another chain", () => {
    const input = { ...baseCredential, chainId: 1 };
    assert.equal(participationCredentialSchema.safeParse(input).success, false);
  });
});

describe("participation parent snapshot", () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        "../../../../specs/001-private-dating/fixtures/participation.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );

  it("should parse the observed Sepolia parent name", () => {
    const result = participationParentSnapshotSchema.safeParse(fixture);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.observedOwner, result.data.issuer);
      assert.equal(result.data.parentPermissions.account, result.data.issuer);
      assert.equal(result.data.parentPermissions.canSetSubregistry, true);
      assert.equal(
        result.data.subregistry,
        "0x0000000000000000000000000000000000000000",
      );
    }
  });

  it("should not treat the parent snapshot as a participant trust configuration", () => {
    assert.equal(participationTrustSchema.safeParse(fixture).success, false);
  });

  it("should reject a different issuer or missing participant Registry", () => {
    const trust = {
      ...participationTrustAnchor,
      participantRegistry: "0x1111111111111111111111111111111111111111",
      participantRegistryCodeHash: `0x${"a".repeat(64)}`,
      resolverImplementationCodeHash: `0x${"b".repeat(64)}`,
    };
    assert.equal(participationTrustSchema.safeParse(trust).success, true);
    assert.equal(
      participationTrustSchema.safeParse({
        ...trust,
        issuer: baseCredential.issuer,
      }).success,
      false,
    );
    assert.equal(
      participationTrustSchema.safeParse({
        ...trust,
        participantRegistry: "0x0000000000000000000000000000000000000000",
      }).success,
      false,
    );
  });
});
