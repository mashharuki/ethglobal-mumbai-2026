import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchLeaseRequestSchema } from "shared";
import {
  authorizeSearchLease,
  type SearchAdmissionReaders,
} from "./admission.ts";

const subject = "0x1111111111111111111111111111111111111111" as const;
const request = {
  ephemeralPublicKey: "0x1234",
  credentialGeneration: `0x${"22".repeat(32)}`,
  credentialVersion: 3,
  registrationVersion: 2,
  ownerSignature: "0xabcd",
};
const nowMs = 1_000;

function readers(
  overrides: Partial<SearchAdmissionReaders> = {},
): SearchAdmissionReaders {
  return {
    verifyOwnerSignature: async () => true,
    readCredential: async () => ({
      ok: true,
      data: {
        subject,
        generation: request.credentialGeneration as `0x${string}`,
        version: 3,
        status: "eligible",
        expiresAtMs: 20_000,
        maxPerRound: 3,
      },
    }),
    readRegistration: async () => ({
      ok: true,
      data: { owner: subject, version: 2, expiresAtMs: 19_000 },
    }),
    readDeposit: async () => ({
      ok: true,
      data: { owner: subject, expiresAtMs: 18_000 },
    }),
    ...overrides,
  };
}

describe("search lease admission", () => {
  it("should derive a lease deadline only from trusted current evidence", async () => {
    const result = await authorizeSearchLease(
      subject,
      request,
      nowMs,
      readers(),
    );
    assert.deepEqual(result, {
      ok: true,
      data: { registrationVersion: 2, maxPerRound: 3, maxExpiresAt: 18_000 },
    });
  });

  it("should reject a stale or suspended credential before reading registration", async () => {
    for (const stale of [
      { version: 2, status: "eligible" as const },
      { version: 3, status: "suspended" as const },
    ]) {
      let registrationReads = 0;
      const base = readers();
      const result = await authorizeSearchLease(
        subject,
        request,
        nowMs,
        readers({
          readCredential: async (owner) => {
            const value = await base.readCredential(owner);
            return value.ok
              ? { ok: true, data: { ...value.data, ...stale } }
              : value;
          },
          readRegistration: async () => {
            registrationReads += 1;
            return base.readRegistration(subject);
          },
        }),
      );
      assert.deepEqual(result, { ok: false, error: "ineligible" });
      assert.equal(registrationReads, 0);
    }
  });

  it("should fail closed when a credential read is unavailable", async () => {
    let registrationReads = 0;
    const result = await authorizeSearchLease(
      subject,
      request,
      nowMs,
      readers({
        readCredential: async () => ({ ok: false, error: "unavailable" }),
        readRegistration: async () => {
          registrationReads += 1;
          return { ok: false, error: "ineligible" };
        },
      }),
    );
    assert.deepEqual(result, { ok: false, error: "unavailable" });
    assert.equal(registrationReads, 0);
  });

  it("should reject stale registration, missing deposit, and bad owner signature", async () => {
    const base = readers();
    const stale = await authorizeSearchLease(
      subject,
      request,
      nowMs,
      readers({
        readRegistration: async () => ({
          ok: true,
          data: { owner: subject, version: 1, expiresAtMs: 19_000 },
        }),
      }),
    );
    assert.deepEqual(stale, { ok: false, error: "ineligible" });
    const noDeposit = await authorizeSearchLease(
      subject,
      request,
      nowMs,
      readers({
        readDeposit: async () => ({ ok: false, error: "unavailable" }),
      }),
    );
    assert.deepEqual(noDeposit, { ok: false, error: "unavailable" });
    const badSignature = await authorizeSearchLease(
      subject,
      request,
      nowMs,
      readers({
        verifyOwnerSignature: async () => false,
        readCredential: async () => {
          assert.fail("credential must not be read after a bad signature");
          return base.readCredential(subject);
        },
      }),
    );
    assert.deepEqual(badSignature, { ok: false, error: "ineligible" });
  });

  it("should reject plaintext fields at the API schema boundary", () => {
    assert.equal(searchLeaseRequestSchema.safeParse(request).success, true);
    assert.equal(
      searchLeaseRequestSchema.safeParse({ ...request, hobbies: ["h1"] })
        .success,
      false,
    );
    assert.equal(
      searchLeaseRequestSchema.safeParse({
        ...request,
        credentialGeneration: "0x11",
      }).success,
      false,
    );
  });
});
