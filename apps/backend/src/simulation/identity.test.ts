import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { it } from "node:test";

import {
  createSimulationAssertion,
  getSimulationAssertionExpiry,
} from "./identity.ts";

it("should issue an assertion accepted by the AIBot HMAC contract", async () => {
  const secret = randomBytes(32).toString("hex");
  const expiry = getSimulationAssertionExpiry(1_800_000_000);
  const assertion = await createSimulationAssertion(
    "0xfb6DF0D12052a1c8E58920654D44015C61552E57",
    secret,
    expiry,
  );
  const [payload, signature] = assertion.split(".");
  assert.equal(
    signature,
    createHmac("sha256", secret).update(payload).digest("base64url"),
  );
  assert.deepEqual(JSON.parse(Buffer.from(payload, "base64url").toString()), {
    sub: "0xfb6DF0D12052a1c8E58920654D44015C61552E57",
    aud: "love-match-masala",
    exp: expiry,
  });
  assert.equal(expiry, 1_800_000_600);
});

it("should reject an undersized identity signing secret", async () => {
  await assert.rejects(
    createSimulationAssertion("subject", "too-short", 1_800_000_600),
  );
});
