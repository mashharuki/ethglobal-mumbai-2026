import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";
import { fileURLToPath, URL } from "node:url";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const backendDirectory = fileURLToPath(new URL("../../", import.meta.url));
const wranglerPath = fileURLToPath(
  new URL("../../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);

async function waitForWorker(
  origin: string,
  processExited: () => boolean,
): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (processExited())
      throw new Error("Local Wrangler exited before readiness");
    try {
      const response = await fetch(origin);
      if (response.status === 404) return;
    } catch {
      // The local socket is not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Local Wrangler did not become ready");
}

test("should consume a SIWE challenge once under concurrent submissions", async () => {
  const port = 30000 + Math.floor(Math.random() * 20000);
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(
    process.execPath,
    [wranglerPath, "dev", "--local", "--port", String(port)],
    {
      cwd: backendDirectory,
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let hasExited = false;
  child.once("exit", () => {
    hasExited = true;
  });

  try {
    await waitForWorker(origin, () => hasExited);
    const account = privateKeyToAccount(generatePrivateKey());
    const challengeResponse = await fetch(`${origin}/v1/auth/challenges`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ address: account.address }),
    });
    assert.equal(challengeResponse.status, 200);
    const challenge = (await challengeResponse.json()) as {
      message: string;
      expiresAt: string;
    };
    assert.ok(new Date(challenge.expiresAt).getTime() > Date.now());
    const malformedMessage = await fetch(`${origin}/v1/auth/sessions`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "not a SIWE message",
        signature: "0x11",
      }),
    });
    assert.equal(malformedMessage.status, 401);
    const oversizedMessage = await fetch(`${origin}/v1/auth/sessions`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "x".repeat(9000), signature: "0x11" }),
    });
    assert.equal(oversizedMessage.status, 422);
    const signature = await account.signMessage({ message: challenge.message });
    const outsider = privateKeyToAccount(generatePrivateKey());
    const invalidSignature = await outsider.signMessage({
      message: challenge.message,
    });
    const invalidResponse = await fetch(`${origin}/v1/auth/sessions`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: challenge.message,
        signature: invalidSignature,
      }),
    });
    assert.equal(invalidResponse.status, 401);
    const invalidError = (await invalidResponse.json()) as { code: string };
    assert.equal(invalidError.code, "UNAUTHENTICATED");
    const sessionRequest = () =>
      fetch(`${origin}/v1/auth/sessions`, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify({ message: challenge.message, signature }),
      });
    const responses = await Promise.all([sessionRequest(), sessionRequest()]);
    assert.deepEqual(
      responses.map((response) => response.status).sort(),
      [204, 409],
    );
    const cookie = responses
      .find((response) => response.status === 204)
      ?.headers.get("set-cookie");
    assert.match(
      cookie ?? "",
      /^st_session=.*;.*HttpOnly;.*Secure;.*SameSite=Strict/i,
    );
    const searchBody = JSON.stringify({
      ephemeralPublicKey: "0x1234",
      credentialGeneration: `0x${"22".repeat(32)}`,
      credentialVersion: 1,
      registrationVersion: 1,
      ownerSignature: "0xabcd",
    });
    const searchHeaders = {
      Origin: origin,
      "Content-Type": "application/json",
      "X-Operation-Id": crypto.randomUUID(),
    };
    const anonymousSearch = await fetch(`${origin}/v1/search-leases`, {
      method: "POST",
      headers: searchHeaders,
      body: searchBody,
    });
    assert.equal(anonymousSearch.status, 401);
    const gatedSearch = await fetch(`${origin}/v1/search-leases`, {
      method: "POST",
      headers: { ...searchHeaders, Cookie: cookie?.split(";")[0] ?? "" },
      body: searchBody,
    });
    assert.equal(gatedSearch.status, 503);
    const operationId = crypto.randomUUID();
    const anonymous = await fetch(`${origin}/v1/operations/${operationId}`);
    assert.equal(anonymous.status, 401);
    const owner = await fetch(`${origin}/v1/operations/${operationId}`, {
      headers: { Cookie: cookie?.split(";")[0] ?? "" },
    });
    assert.equal(owner.status, 404);
    const wrongOrigin = await fetch(`${origin}/v1/auth/challenges`, {
      method: "POST",
      headers: {
        Origin: "https://other.example",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ address: account.address }),
    });
    assert.equal(wrongOrigin.status, 422);
    const alternateCase = await fetch(`${origin}/v1/auth/challenges`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        address: `0x${outsider.address.slice(2).toUpperCase()}`,
      }),
    });
    assert.equal(alternateCase.status, 200);
    for (let index = 0; index < 5; index += 1) {
      const response = await fetch(`${origin}/v1/auth/challenges`, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json" },
        body: JSON.stringify({ address: account.address }),
      });
      assert.equal(response.status, index === 4 ? 429 : 200);
      if (index === 4) {
        assert.equal(response.headers.get("Retry-After"), "60");
        const limitError = (await response.json()) as { code: string };
        assert.equal(limitError.code, "RATE_LIMITED");
      }
    }
  } finally {
    if (!hasExited) {
      child.kill("SIGTERM");
      await once(child, "exit");
    }
  }
});
