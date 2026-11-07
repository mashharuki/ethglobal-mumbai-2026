import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  checkMatchProofContext,
  getMatchSessionDigest,
  type MatchContext,
  type MatchProofInputs,
} from "./context.ts";

const id = (value: number): `0x${string}` =>
  `0x${value.toString(16).padStart(64, "0")}`;

function makeContext(): MatchContext {
  return {
    schemaVersion: 1,
    dictionaryVersion: 1,
    chainId: 11155111,
    first: {
      subjectId: id(41),
      issuanceId: id(51),
      credentialVersion: 3,
      profileVersion: 1,
      registrationRoot: id(61),
      leaseId: id(71),
      leaseVersion: 1,
      leaseExpiresAt: 2_000_000_000,
    },
    second: {
      subjectId: id(42),
      issuanceId: id(52),
      credentialVersion: 1,
      profileVersion: 1,
      registrationRoot: id(62),
      leaseId: id(72),
      leaseVersion: 1,
      leaseExpiresAt: 2_000_000_000,
    },
    firstChallenge: id(81),
    secondChallenge: id(82),
    publicKeyX: id(91),
    publicKeyY: id(92),
  };
}

function proofInputs(context: MatchContext): MatchProofInputs {
  const digest = getMatchSessionDigest(context);
  const participant = (part: MatchContext["first"]) => [
    1n,
    1n,
    BigInt(part.subjectId),
    0n,
    BigInt(part.issuanceId),
    0n,
    BigInt(part.profileVersion),
    BigInt(part.registrationRoot),
    digest,
    BigInt(context.publicKeyX),
    BigInt(context.publicKeyY),
    999n,
  ];
  return {
    a: participant(context.first),
    b: participant(context.second),
    result: [
      digest,
      999n,
      BigInt(context.publicKeyX),
      BigInt(context.publicKeyY),
      0n,
      0n,
      0n,
      0n,
      0n,
      1n,
    ],
  };
}

describe("matching proof context", () => {
  it("should accept the original ordered, unexpired proof claims", () => {
    const context = makeContext();
    const result = checkMatchProofContext(
      context,
      proofInputs(context),
      1_900_000_000,
    );
    assert.equal(result.ok, true);
  });

  it("should reject role reversal without changing the proof", () => {
    const context = makeContext();
    const swapped = {
      ...context,
      first: context.second,
      second: context.first,
    };
    assert.deepEqual(
      checkMatchProofContext(swapped, proofInputs(context), 1_900_000_000),
      {
        ok: false,
        error: "PROOF_CONTEXT_MISMATCH",
      },
    );
  });

  it("should reject a stale credential, profile, or lease version", () => {
    const context = makeContext();
    const inputs = proofInputs(context);
    const changed = [
      { ...context, first: { ...context.first, credentialVersion: 4 } },
      { ...context, second: { ...context.second, profileVersion: 2 } },
      { ...context, second: { ...context.second, leaseVersion: 2 } },
    ];
    for (const candidate of changed) {
      assert.deepEqual(
        checkMatchProofContext(candidate, inputs, 1_900_000_000),
        {
          ok: false,
          error: "PROOF_CONTEXT_MISMATCH",
        },
      );
    }
  });

  it("should reject an expired lease at its exact deadline", () => {
    const context = makeContext();
    assert.deepEqual(
      checkMatchProofContext(context, proofInputs(context), 2_000_000_000),
      {
        ok: false,
        error: "EXPIRED_LEASE",
      },
    );
  });

  it("should reject mixed ciphertext from a different proof", () => {
    const context = makeContext();
    const original = proofInputs(context);
    const mixed = { ...original, b: [...original.b.slice(0, 11), 998n] };
    assert.deepEqual(checkMatchProofContext(context, mixed, 1_900_000_000), {
      ok: false,
      error: "PROOF_CONTEXT_MISMATCH",
    });
  });

  it("should reject duplicate participants and malformed external data", () => {
    const context = makeContext();
    const duplicate = {
      ...context,
      second: { ...context.second, subjectId: context.first.subjectId },
    };
    assert.deepEqual(
      checkMatchProofContext(duplicate, proofInputs(context), 1_900_000_000),
      {
        ok: false,
        error: "INVALID_CONTEXT",
      },
    );
    assert.deepEqual(
      checkMatchProofContext(
        { ...context, publicKeyX: "abc" },
        proofInputs(context),
        1_900_000_000,
      ),
      {
        ok: false,
        error: "INVALID_CONTEXT",
      },
    );
  });
});
