import assert from "node:assert/strict";
import { test } from "node:test";
import { readBoundedJsonBody } from "./request-body.ts";

function jsonRequest(body: string): Request {
  return new Request("https://example.test/v1/auth/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

test("should parse a JSON request at its byte limit", async () => {
  const body = '{"ok":true}';
  const parsed = await readBoundedJsonBody(jsonRequest(body), body.length);
  assert.deepEqual(parsed, { ok: true });
});

test("should reject an oversized JSON body before parsing", async () => {
  const parsed = await readBoundedJsonBody(jsonRequest('{"ok":true}'), 10);
  assert.equal(parsed, null);
});

test("should count UTF-8 bytes instead of characters", async () => {
  const parsed = await readBoundedJsonBody(jsonRequest('"é"'), 3);
  assert.equal(parsed, null);
});

test("should reject malformed JSON and non-JSON content types", async () => {
  assert.equal(await readBoundedJsonBody(jsonRequest("{bad"), 100), null);
  const plain = new Request("https://example.test/", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "{}",
  });
  assert.equal(await readBoundedJsonBody(plain, 100), null);
});
