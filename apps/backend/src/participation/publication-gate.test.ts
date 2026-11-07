import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath, URL } from "node:url";

import { bytes, str, u64 } from "@arkiv-network/sdk/schema";
import {
  credentialReferenceSchema,
  participationCredentialSchema,
  participationTrustSchema,
} from "shared";
import { decodeFunctionData, parseAbi } from "viem";

import {
  prepareCredentialReferenceAfterReadback,
  prepareSignedCredentialPublication,
} from "./publication-gate.ts";

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
const signed = participationCredentialSchema.parse(
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
const { signature: _, ...expected } = signed;
const observedAt = 1794500000n;
const resolver = "0x28a0549e48190d69Ae8Bf6046713F766B20A5598";
const textAbi = parseAbi([
  "function setText(bytes name, string key, string value)",
]);

function makeRow() {
  return {
    $key: reference.arkivEntityKey as `0x${string}`,
    $owner: trust.issuer as `0x${string}`,
    $creator: trust.issuer as `0x${string}`,
    $creationFlags: { readonly: true, permissionlessExtension: false, raw: 1 },
    issuance_id: str(signed.issuanceId),
    credential_version: u64(1n),
    record_digest: str(reference.digest),
    media_type: str("application/json"),
    content: bytes(new TextEncoder().encode(JSON.stringify(signed))),
  };
}

describe("issuer credential publication gate", () => {
  it("should prepare an issuer-signed initial credential for immutable Arkiv publication", async () => {
    const result = await prepareSignedCredentialPublication({
      expected,
      signed,
      trust,
      observedAt,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.publication.recordDigest, reference.digest);
    assert.equal(result.data.publication.credentialVersion, 1);
    assert.equal(result.data.publication.options.flags?.readonly, true);
  });

  it("should reject a signed body that differs from the verified issuance draft", async () => {
    const result = await prepareSignedCredentialPublication({
      expected: { ...expected, credentialVersion: 2 },
      signed,
      trust,
      observedAt,
    });
    assert.deepEqual(result, { ok: false, error: "CREDENTIAL_MISMATCH" });
  });

  it("should reject a forged issuer before an Arkiv plan exists", async () => {
    const result = await prepareSignedCredentialPublication({
      expected,
      signed: { ...signed, signature: `0x${"0".repeat(130)}` },
      trust,
      observedAt,
    });
    assert.deepEqual(result, { ok: false, error: "SIGNATURE_INVALID" });
  });

  it("should create the ENS reference call only after immutable Arkiv readback", async () => {
    const result = await prepareCredentialReferenceAfterReadback({
      expected,
      signed,
      trust,
      observedAt,
      row: makeRow(),
      resolver,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.data.reference, reference);
    assert.equal(
      result.data.ensUpdate.to.toLowerCase(),
      resolver.toLowerCase(),
    );
    const decoded = decodeFunctionData({
      abi: textAbi,
      data: result.data.ensUpdate.data,
    });
    assert.equal(decoded.functionName, "setText");
    assert.equal(decoded.args[1], "app.credential");
  });

  it("should withhold the ENS call if the Arkiv readback is mutable", async () => {
    const row = makeRow();
    const result = await prepareCredentialReferenceAfterReadback({
      expected,
      signed,
      trust,
      observedAt,
      row: {
        ...row,
        $creationFlags: {
          readonly: false,
          permissionlessExtension: false,
          raw: 0,
        },
      },
      resolver,
    });
    assert.deepEqual(result, { ok: false, error: "REFERENCE_MISMATCH" });
  });
});
