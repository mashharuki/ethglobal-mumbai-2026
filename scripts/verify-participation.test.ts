import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  checkCredential as checkWebCredential,
  fromNetwork as fromWebNetwork,
} from "../apps/frontend/src/pages/participation-verifier.ts";
import {
  credentialReferenceSchema,
  participationCredentialSchema,
  participationTrustSchema,
} from "../packages/shared/src/index.ts";
import {
  checkCredential as checkCliCredential,
  fromNetwork as fromCliNetwork,
} from "./verify-participation.ts";

const evidenceRoot = new URL(
  "../specs/001-private-dating/evidence/",
  import.meta.url,
);
function loadEvidence(filename: string): unknown {
  return JSON.parse(readFileSync(new URL(filename, evidenceRoot), "utf8"));
}

const signedEvidence = loadEvidence("ens-alice-credential-signed.json");
const referenceEvidence = loadEvidence("ens-alice-reference.json");
const credential = participationCredentialSchema.parse(
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
const clients = [
  { name: "Web", check: checkWebCredential, fromNetwork: fromWebNetwork },
  { name: "CLI", check: checkCliCredential, fromNetwork: fromCliNetwork },
] as const;

function hasCode(expected: string): (error: unknown) => boolean {
  return (error) =>
    error instanceof Error && "code" in error && error.code === expected;
}

for (const client of clients) {
  describe(`${client.name} independent participation verifier`, () => {
    it("should accept the signed Alice fixture with its current reference", async () => {
      await assert.doesNotReject(
        client.check(
          credential,
          credential.issuanceId,
          reference,
          trust,
          credential.subject as `0x${string}`,
          credential.dnsName,
        ),
      );
    });

    it("should reject an old credential when the reference is version 2", async () => {
      await assert.rejects(
        client.check(
          credential,
          credential.issuanceId,
          { ...reference, credentialVersion: 2 },
          trust,
          credential.subject as `0x${string}`,
          credential.dnsName,
        ),
        hasCode("REFERENCE_MISMATCH"),
      );
    });

    it("should reject a changed issuance ID in the Arkiv row", async () => {
      await assert.rejects(
        client.check(
          credential,
          `0x${"0".repeat(64)}`,
          reference,
          trust,
          credential.subject as `0x${string}`,
          credential.dnsName,
        ),
        hasCode("REFERENCE_MISMATCH"),
      );
    });

    it("should reject a credential falsely naming another issuer", async () => {
      await assert.rejects(
        client.check(
          { ...credential, issuer: credential.subject },
          credential.issuanceId,
          reference,
          trust,
          credential.subject as `0x${string}`,
          credential.dnsName,
        ),
        hasCode("SIGNATURE_INVALID"),
      );
    });

    it("should classify ENS and Arkiv transport failures as unavailable", async () => {
      for (const code of ["ENS_UNAVAILABLE", "ARKIV_UNAVAILABLE"] as const) {
        await assert.rejects(
          client.fromNetwork(async () => {
            throw new Error("network down");
          }, code),
          hasCode(code),
        );
      }
    });
  });
}
