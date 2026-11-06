import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import {
  deriveIssuanceId,
  getParticipationTypedData,
  hashParticipationMessage,
  hashParticipationRecord,
  verifyParticipationSignature,
} from "./credential.ts";
import { unsignedParticipationCredentialSchema } from "./schema.ts";

function makeCredential(issuer: string) {
  const registry = "0x1111111111111111111111111111111111111111";
  const transactionHash = `0x${"b".repeat(64)}`;
  const logIndex = 2;
  return unsignedParticipationCredentialSchema.parse({
    schemaVersion: 1,
    chainId: 11155111,
    registry,
    issuer,
    subject: "0x3333333333333333333333333333333333333333",
    dnsName: "a.secrettinder.eth",
    issuanceId: deriveIssuanceId(11155111, registry, transactionHash, logIndex),
    issuanceEvent: { transactionHash, logIndex },
    credentialVersion: 1,
    status: "eligible",
    expiresAt: 1825526676,
    policyVersion: 1,
    accessTier: "new",
    suspendedUntil: null,
  });
}

describe("participation EIP-712 signature", () => {
  it("should verify an issuer signature for a synthetic credential", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const unsigned = makeCredential(account.address);
    const signature = await account.signTypedData(
      getParticipationTypedData(unsigned),
    );
    const credential = { ...unsigned, signature };

    const result = await verifyParticipationSignature(credential);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(
        result.data.messageDigest,
        hashParticipationMessage(unsigned),
      );
      assert.equal(
        result.data.recordDigest,
        hashParticipationRecord(credential),
      );
    }
  });

  it("should reject a changed access tier after signing", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const unsigned = makeCredential(account.address);
    const signature = await account.signTypedData(
      getParticipationTypedData(unsigned),
    );

    const result = await verifyParticipationSignature({
      ...unsigned,
      accessTier: "standard",
      signature,
    });
    assert.deepEqual(result, { ok: false, error: "SIGNATURE_INVALID" });
  });

  it("should bind the credential version to the digest", () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const unsigned = makeCredential(account.address);
    assert.notEqual(
      hashParticipationMessage(unsigned),
      hashParticipationMessage({ ...unsigned, credentialVersion: 2 }),
    );
  });

  it("should reject a signed but inconsistent issuance identifier", async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const unsigned = {
      ...makeCredential(account.address),
      issuanceId: `0x${"a".repeat(64)}`,
    };
    const signature = await account.signTypedData(
      getParticipationTypedData(unsigned),
    );

    const result = await verifyParticipationSignature({
      ...unsigned,
      signature,
    });
    assert.deepEqual(result, { ok: false, error: "INVALID_CREDENTIAL" });
  });
});
