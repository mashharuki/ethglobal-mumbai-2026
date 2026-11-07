import assert from "node:assert/strict";
import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath, URL } from "node:url";
import type { DateRequestWrite, PendingDateRequest } from "./routes.ts";

const backendDirectory = fileURLToPath(new URL("../../", import.meta.url));
const wranglerPath = fileURLToPath(
  new URL("../../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);
const port = 30000 + Math.floor(Math.random() * 20000);
const origin = `http://127.0.0.1:${port}`;
let stateDirectory: string;
let child: ChildProcess;
let hasExited = false;

async function startFixture(): Promise<void> {
  hasExited = false;
  child = spawn(
    process.execPath,
    [
      wranglerPath,
      "dev",
      "--local",
      "--config",
      "src/simulation/wrangler.date-fixture.jsonc",
      "--persist-to",
      stateDirectory,
      "--port",
      String(port),
    ],
    {
      cwd: backendDirectory,
      env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.once("exit", () => {
    hasExited = true;
  });
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (hasExited) throw new Error("Date request fixture exited");
    try {
      const response = await fetch(origin);
      if (response.status === 404) return;
    } catch {
      // The local Worker has not started listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Date request fixture did not start");
}

async function createRequest(
  input: PendingDateRequest,
): Promise<DateRequestWrite> {
  const response = await fetch(origin, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  assert.equal(response.status, 200);
  return (await response.json()) as DateRequestWrite;
}

before(async () => {
  stateDirectory = await mkdtemp(join(tmpdir(), "date-requests-"));
  await startFixture();
});

after(async () => {
  if (child && !hasExited) {
    child.kill();
    await once(child, "exit");
  }
  if (stateDirectory)
    await rm(stateDirectory, { recursive: true, force: true });
});

describe("durable date request store", () => {
  it("should return one pending ID for concurrent identical retries", async () => {
    const input = {
      playerSubject: "alice",
      matchId: "match-1",
      gameSessionId: "game-concurrent",
    };
    const results = await Promise.all(
      Array.from({ length: 8 }, () => createRequest(input)),
    );
    assert.ok(results.every((result) => result.ok));
    const first = results[0];
    assert.equal(first.ok, true);
    assert.ok(
      results.every((result) =>
        result.ok ? result.data.requestId === first.data.requestId : false,
      ),
    );
    assert.equal(first.data.status, "pending");
  });

  it("should reject the same session key with another match or subject", async () => {
    const input = {
      playerSubject: "alice",
      matchId: "match-1",
      gameSessionId: "game-conflict",
    };
    assert.equal((await createRequest(input)).ok, true);
    assert.deepEqual(await createRequest({ ...input, matchId: "match-2" }), {
      ok: false,
      error: "CONFLICT",
    });
    assert.deepEqual(await createRequest({ ...input, playerSubject: "bob" }), {
      ok: false,
      error: "CONFLICT",
    });
  });

  it("should retain the same request ID after a local Worker restart", async () => {
    const input = {
      playerSubject: "alice",
      matchId: "match-1",
      gameSessionId: "game-restart",
    };
    const first = await createRequest(input);
    assert.equal(first.ok, true);
    child.kill();
    await once(child, "exit");
    await startFixture();
    assert.deepEqual(await createRequest(input), first);
  });
});
