import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { describe, it } from "node:test";
import { fileURLToPath, URL } from "node:url";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const backendDirectory = fileURLToPath(new URL("../../", import.meta.url));
const wranglerPath = fileURLToPath(
  new URL("../../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);

async function waitForWorker(
  origin: string,
  exited: () => boolean,
): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (exited()) throw new Error("Local Wrangler exited before readiness");
    try {
      if ((await fetch(origin)).status === 404) return;
    } catch {
      // Local socket is not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Local Wrangler did not become ready");
}

async function signIn(
  origin: string,
  account: ReturnType<typeof privateKeyToAccount>,
): Promise<string> {
  const challengeResponse = await fetch(`${origin}/v1/auth/challenges`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ address: account.address }),
  });
  assert.equal(challengeResponse.status, 200);
  const challenge = (await challengeResponse.json()) as { message: string };
  const signature = await account.signMessage({ message: challenge.message });
  const session = await fetch(`${origin}/v1/auth/sessions`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ message: challenge.message, signature }),
  });
  assert.equal(session.status, 204);
  return session.headers.get("set-cookie")?.split(";")[0] ?? "";
}

describe("private review API", () => {
  it("should keep notices, responses and appeals accessible to a suspended owner only", async () => {
    const port = 30000 + Math.floor(Math.random() * 20000);
    const origin = `http://127.0.0.1:${port}`;
    const child = spawn(
      process.execPath,
      [
        wranglerPath,
        "dev",
        "src/participation/review-harness.ts",
        "--local",
        "--port",
        String(port),
      ],
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
      const owner = privateKeyToAccount(generatePrivateKey());
      const outsider = privateKeyToAccount(generatePrivateKey());
      const reviewingId = `reviewing-${crypto.randomUUID()}`;
      const decidedId = `decided-${crypto.randomUUID()}`;
      const ownerCookie = await signIn(origin, owner);
      const outsiderCookie = await signIn(origin, outsider);
      for (const state of ["reviewing", "decided"]) {
        const seeded = await fetch(`${origin}/__seed-review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: state === "reviewing" ? reviewingId : decidedId,
            target: owner.address,
            state,
          }),
        });
        assert.equal(seeded.status, 200, await seeded.text());
      }
      const ownerNotice = await fetch(
        `${origin}/v1/review-cases/${decidedId}`,
        { headers: { Cookie: ownerCookie } },
      );
      assert.equal(ownerNotice.status, 200);
      const notice = (await ownerNotice.json()) as {
        state: string;
        suspendedUntil: string;
      };
      assert.equal(notice.state, "decided");
      assert.ok(new Date(notice.suspendedUntil).getTime() > Date.now());
      assert.equal(ownerNotice.headers.get("Cache-Control"), "no-store");
      const outsiderNotice = await fetch(
        `${origin}/v1/review-cases/${decidedId}`,
        { headers: { Cookie: outsiderCookie } },
      );
      assert.equal(outsiderNotice.status, 404);
      const anonymousNotice = await fetch(
        `${origin}/v1/review-cases/${decidedId}`,
      );
      assert.equal(anonymousNotice.status, 401);

      const responseId = crypto.randomUUID();
      const responseRequest = () =>
        fetch(`${origin}/v1/review-cases/${reviewingId}/responses`, {
          method: "POST",
          headers: {
            Origin: origin,
            Cookie: ownerCookie,
            "Content-Type": "application/json",
            "X-Operation-Id": responseId,
          },
          body: JSON.stringify({ expectedRevision: 1, fixtureId: "synthetic" }),
        });
      assert.equal((await responseRequest()).status, 202);
      assert.equal((await responseRequest()).status, 202);
      const afterResponse = await fetch(
        `${origin}/v1/review-cases/${reviewingId}`,
        { headers: { Cookie: ownerCookie } },
      );
      assert.equal(
        ((await afterResponse.json()) as { revision: number }).revision,
        2,
      );
      const ownerOperation = await fetch(
        `${origin}/v1/operations/${responseId}`,
        { headers: { Cookie: ownerCookie } },
      );
      assert.equal(ownerOperation.status, 200);
      const outsiderOperation = await fetch(
        `${origin}/v1/operations/${responseId}`,
        { headers: { Cookie: outsiderCookie } },
      );
      assert.equal(outsiderOperation.status, 404);

      const appealId = crypto.randomUUID();
      const appealed = await fetch(
        `${origin}/v1/review-cases/${decidedId}/appeals`,
        {
          method: "POST",
          headers: {
            Origin: origin,
            Cookie: ownerCookie,
            "Content-Type": "application/json",
            "X-Operation-Id": appealId,
          },
          body: JSON.stringify({ expectedRevision: 1, fixtureId: "synthetic" }),
        },
      );
      assert.equal(appealed.status, 202);
      const afterAppeal = await fetch(
        `${origin}/v1/review-cases/${decidedId}`,
        { headers: { Cookie: ownerCookie } },
      );
      const appealDetail = (await afterAppeal.json()) as {
        state: string;
        suspendedUntil: string;
      };
      assert.equal(appealDetail.state, "appealed");
      assert.equal(appealDetail.suspendedUntil, notice.suspendedUntil);
    } finally {
      if (!hasExited) {
        child.kill("SIGTERM");
        await once(child, "exit");
      }
    }
  });
});
