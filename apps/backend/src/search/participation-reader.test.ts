import assert from "node:assert/strict";
import { test } from "node:test";
import { readDemoParticipationCredential } from "./participation-reader.ts";

const alice = "0xfb6DF0D12052a1c8E58920654D44015C61552E57";
const bob = "0xD1D13C313FfBB0dD00898D8c705794D082Dc388e";

test("the verified Alice credential reaches the admission gate", async () => {
  const result = await readDemoParticipationCredential(alice, async (label) => {
    assert.equal(label, "alice");
    return {
      ok: true,
      data: {
        subject: alice,
        generation: `0x${"1".repeat(64)}`,
        version: 3,
        status: "eligible",
        expiresAtMs: Date.now() + 60_000,
        maxPerRound: 1,
      },
    };
  });
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.data.subject, alice);
});

test("a credential for another wallet is rejected", async () => {
  const result = await readDemoParticipationCredential(alice, async () => ({
    ok: true,
    data: {
      subject: bob,
      generation: `0x${"1".repeat(64)}`,
      version: 3,
      status: "eligible",
      expiresAtMs: Date.now() + 60_000,
      maxPerRound: 1,
    },
  }));
  assert.deepEqual(result, { ok: false, error: "ineligible" });
});

test("unknown wallets fail closed without a network request", async () => {
  const result = await readDemoParticipationCredential(
    "0x0000000000000000000000000000000000000001",
    async () => {
      throw new Error("should not read network");
    },
  );
  assert.deepEqual(result, { ok: false, error: "unavailable" });
});
