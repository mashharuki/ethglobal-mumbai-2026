import assert from "node:assert/strict";
import { it } from "node:test";

import { verifyTypedData } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import {
  acceptanceReceiptTypes,
  createNoteVectors,
  lockConsentTypes,
  noteSignatureDomain,
} from "./note-vectors.ts";

it("should preserve each original principal and the fixed seven-day deadline", () => {
  const coordinator = privateKeyToAccount(generatePrivateKey());
  const vectors = createNoteVectors(coordinator.address);
  assert.deepEqual(
    vectors.settlePayouts,
    vectors.deposits.map((deposit) => ({
      recipient: deposit.owner,
      token: deposit.token,
      amount: deposit.amount,
    })),
  );
  for (const deposit of vectors.deposits) {
    assert.equal(deposit.expiresAt - deposit.depositedAt, 604_800);
    assert.ok(vectors.acceptance.expiresAt < deposit.expiresAt);
  }
  assert.equal(vectors.oneUnitDeposit.amount, 101n);
  assert.deepEqual(Object.keys(vectors.lockPublic).sort(), [
    "commitments",
    "expiresAt",
    "inputDigest",
    "nullifiers",
  ]);
});

it("should bind each lock consent to chain, contract, note and deadline", async () => {
  const coordinator = privateKeyToAccount(generatePrivateKey());
  const alice = privateKeyToAccount(generatePrivateKey());
  const bob = privateKeyToAccount(generatePrivateKey());
  const vectors = createNoteVectors(
    coordinator.address,
    alice.address,
    bob.address,
  );
  const signature = await alice.signTypedData({
    domain: noteSignatureDomain,
    types: lockConsentTypes,
    primaryType: "LockConsent",
    message: vectors.lockConsent[0],
  });
  const verify = (
    domain: typeof noteSignatureDomain,
    message: (typeof vectors.lockConsent)[0],
  ) =>
    verifyTypedData({
      address: alice.address,
      domain,
      types: lockConsentTypes,
      primaryType: "LockConsent",
      message,
      signature,
    });
  assert.equal(await verify(noteSignatureDomain, vectors.lockConsent[0]), true);
  assert.equal(
    await verify(noteSignatureDomain, vectors.lockConsent[1]),
    false,
  );
  assert.equal(
    await verify(noteSignatureDomain, {
      ...vectors.lockConsent[0],
      deadline: vectors.lockConsent[0].deadline + 1,
    }),
    false,
  );
  assert.equal(
    await verify(
      { ...noteSignatureDomain, chainId: 1 },
      vectors.lockConsent[0],
    ),
    false,
  );
});

it("should accept a receipt only from the pinned coordinator key and version", async () => {
  const coordinator = privateKeyToAccount(generatePrivateKey());
  const outsider = privateKeyToAccount(generatePrivateKey());
  const vectors = createNoteVectors(coordinator.address);
  const signature = await coordinator.signTypedData({
    domain: noteSignatureDomain,
    types: acceptanceReceiptTypes,
    primaryType: "AcceptanceReceipt",
    message: vectors.acceptance,
  });
  const verify = (address: typeof coordinator.address, version: number) =>
    verifyTypedData({
      address,
      domain: noteSignatureDomain,
      types: acceptanceReceiptTypes,
      primaryType: "AcceptanceReceipt",
      message: { ...vectors.acceptance, issuerKeyVersion: version },
      signature,
    });
  assert.equal(await verify(vectors.trustedReceiptKey.address, 1), true);
  assert.equal(await verify(outsider.address, 1), false);
  assert.equal(await verify(vectors.trustedReceiptKey.address, 2), false);
});
