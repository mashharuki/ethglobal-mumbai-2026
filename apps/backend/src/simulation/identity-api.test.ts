import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
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
  hasExited: () => boolean,
): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (hasExited()) throw new Error("Local Wrangler exited before readiness");
    try {
      if ((await fetch(origin)).status === 404) return;
    } catch {
      // Wait for the local socket.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Local Wrangler did not become ready");
}

async function createSessionCookie(origin: string): Promise<string> {
  const account = privateKeyToAccount(generatePrivateKey());
  const headers = { Origin: origin, "Content-Type": "application/json" };
  const challengeResponse = await fetch(`${origin}/v1/auth/challenges`, {
    method: "POST",
    headers,
    body: JSON.stringify({ address: account.address }),
  });
  assert.equal(challengeResponse.status, 200);
  const challenge = (await challengeResponse.json()) as { message: string };
  const signature = await account.signMessage({ message: challenge.message });
  const sessionResponse = await fetch(`${origin}/v1/auth/sessions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message: challenge.message, signature }),
  });
  assert.equal(sessionResponse.status, 204);
  return sessionResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
}

test("should issue an authenticated, same-origin, idempotent AIBot assertion", async () => {
  const port = 30000 + Math.floor(Math.random() * 20000);
  const origin = `http://127.0.0.1:${port}`;
  const secret = randomBytes(32).toString("hex");
  const worker = spawn(
    process.execPath,
    [
      wranglerPath,
      "dev",
      "--local",
      "--port",
      String(port),
      "--var",
      `MATCHING_IDENTITY_SECRET:${secret}`,
    ],
    {
      cwd: backendDirectory,
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let hasExited = false;
  worker.once("exit", () => {
    hasExited = true;
  });

  try {
    await waitForWorker(origin, () => hasExited);
    const operationId = randomUUID();
    const request = (cookie?: string, requestOrigin = origin) =>
      fetch(`${origin}/v1/simulation/identity`, {
        method: "POST",
        headers: {
          Origin: requestOrigin,
          "X-Operation-Id": operationId,
          ...(cookie ? { Cookie: cookie } : {}),
        },
      });
    assert.equal((await request()).status, 401);
    const cookie = await createSessionCookie(origin);
    assert.equal((await request(cookie, "https://other.example")).status, 422);
    const first = await request(cookie);
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("Cache-Control"), "no-store");
    const result = (await first.json()) as { assertion: string };
    const [payload, signature] = result.assertion.split(".");
    assert.equal(
      signature,
      createHmac("sha256", secret).update(payload).digest("base64url"),
    );
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      aud: string;
      exp: number;
      sub: string;
    };
    assert.equal(claims.aud, "love-match-masala");
    assert.equal(claims.sub.length, 42);
    assert.ok(claims.exp > Math.floor(Date.now() / 1000));
    const replay = await request(cookie);
    assert.equal(replay.status, 200);
    assert.equal(
      ((await replay.json()) as { assertion: string }).assertion,
      result.assertion,
    );
  } finally {
    if (!hasExited) {
      worker.kill("SIGTERM");
      await once(worker, "exit");
    }
  }
});
