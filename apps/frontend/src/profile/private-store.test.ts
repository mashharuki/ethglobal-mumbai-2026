/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createEncryptedBackup,
  restoreEncryptedBackup,
} from "./private-store.ts";

const encoder = new TextEncoder();
const passphrase = "synthetic test passphrase only";
const material = {
  profile: encoder.encode('{"hobby":"music"}'),
  secret: encoder.encode("synthetic-private-randomness"),
};

describe("private profile backup", () => {
  it("should round-trip profile and secret with a randomized encrypted envelope", async () => {
    const first = await createEncryptedBackup(material, passphrase);
    const second = await createEncryptedBackup(material, passphrase);
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (!first.ok || !second.ok) return;
    assert.notEqual(first.data, second.data);
    assert.equal(first.data.includes("music"), false);
    assert.equal(first.data.includes("synthetic-private-randomness"), false);
    const restored = await restoreEncryptedBackup(first.data, passphrase);
    assert.equal(restored.ok, true);
    if (!restored.ok) return;
    assert.deepEqual(restored.data.profile, material.profile);
    assert.deepEqual(restored.data.secret, material.secret);
  });

  it("should reject wrong passphrases and tampered ciphertext", async () => {
    const created = await createEncryptedBackup(material, passphrase);
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const wrong = await restoreEncryptedBackup(
      created.data,
      "wrong synthetic passphrase",
    );
    assert.deepEqual(wrong, { ok: false, error: "INVALID_BACKUP" });
    const parsed = JSON.parse(created.data) as Record<string, unknown>;
    const ciphertext = String(parsed.ciphertext);
    parsed.ciphertext = `${ciphertext[0] === "A" ? "B" : "A"}${ciphertext.slice(1)}`;
    const tampered = await restoreEncryptedBackup(
      JSON.stringify(parsed),
      passphrase,
    );
    assert.deepEqual(tampered, { ok: false, error: "INVALID_BACKUP" });
  });

  it("should reject short passphrases, oversized material and unknown fields", async () => {
    assert.deepEqual(await createEncryptedBackup(material, "short"), {
      ok: false,
      error: "PASSPHRASE_TOO_SHORT",
    });
    assert.deepEqual(
      await createEncryptedBackup(
        { profile: new Uint8Array(65_537), secret: material.secret },
        passphrase,
      ),
      { ok: false, error: "INVALID_INPUT" },
    );
    const created = await createEncryptedBackup(material, passphrase);
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const parsed = JSON.parse(created.data) as Record<string, unknown>;
    assert.deepEqual(
      await restoreEncryptedBackup(
        JSON.stringify({ ...parsed, profile: "leak" }),
        passphrase,
      ),
      { ok: false, error: "INVALID_BACKUP" },
    );
  });
});
