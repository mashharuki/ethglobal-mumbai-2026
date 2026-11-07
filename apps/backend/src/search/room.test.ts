import assert from "node:assert/strict";
import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath, URL } from "node:url";
import type { Assignment } from "./coordinator.ts";
import type { SearchLease } from "./room.ts";

const backendDirectory = fileURLToPath(new URL("../../", import.meta.url));
const wranglerPath = fileURLToPath(
  new URL("../../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);
const port = 30000 + Math.floor(Math.random() * 20000);
const origin = `http://127.0.0.1:${port}`;
let child: ChildProcess;
let stateDirectory: string;
let hasExited = false;
const trafficByRoom = new Map<string, { requests: number; bytes: number }>();

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
type Reserved = {
  assignmentId: string;
  assignment: Assignment;
  expiresAt: number;
};

async function post<T>(
  roomId: string,
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const payload = JSON.stringify({ roomId, ...body });
  const response = await fetch(`${origin}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
  assert.equal(response.status, 200);
  const result = await response.text();
  const traffic = trafficByRoom.get(roomId) ?? { requests: 0, bytes: 0 };
  traffic.requests += 1;
  traffic.bytes += Buffer.byteLength(payload) + Buffer.byteLength(result);
  trafficByRoom.set(roomId, traffic);
  return JSON.parse(result) as T;
}

async function open(
  roomId: string,
  subjectId: string,
  now: number,
  version = 1,
  maxPerRound: 1 | 3 = 3,
): Promise<SearchLease> {
  const result = await post<Result<SearchLease>>(roomId, "/open", {
    operationId: `${subjectId}-${now}`,
    subjectId,
    registrationVersion: version,
    maxPerRound,
    maxExpiresAt: now + 600_000,
    now,
  });
  assert.equal(result.ok, true);
  return result.data;
}

async function startFixture(): Promise<void> {
  hasExited = false;
  child = spawn(
    process.execPath,
    [
      wranglerPath,
      "dev",
      "--local",
      "--config",
      "src/search/wrangler.fixture.jsonc",
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
    if (hasExited) throw new Error("Search fixture worker exited");
    try {
      const response = await fetch(origin);
      if (response.status === 404) return;
    } catch {
      // Wrangler's local socket is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Search fixture worker did not start");
}

before(async () => {
  stateDirectory = await mkdtemp(join(tmpdir(), "search-fixture-"));
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

describe("persistent search coordinator", () => {
  it("should reserve one assignment atomically under concurrent requests", async () => {
    const roomId = "concurrent";
    await open(roomId, "alice", 1);
    await open(roomId, "bob", 1);
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        post<Result<Reserved>>(roomId, "/reserve", {
          now: 2,
          blockedPairs: [],
        }),
      ),
    );
    assert.equal(results.filter((result) => result.ok).length, 1);
    assert.ok(
      results
        .filter((result) => !result.ok)
        .every((result) => (result.ok ? false : result.error === "not_found")),
    );
  });

  it("should reject replay extension and enforce the exact expiry boundary", async () => {
    const roomId = "replay";
    const first = await open(roomId, "alice", 1);
    const replay = await post<Result<SearchLease>>(roomId, "/open", {
      operationId: "alice-1",
      subjectId: "alice",
      registrationVersion: 1,
      maxPerRound: 3,
      maxExpiresAt: 600_001,
      now: 20_000,
    });
    assert.equal(replay.ok, true);
    if (replay.ok) assert.equal(replay.data.expiresAt, first.expiresAt);
    const renewed = await post<Result<SearchLease>>(roomId, "/renew", {
      operationId: "renew-once",
      leaseId: first.leaseId,
      subjectId: "alice",
      now: 10_000,
    });
    assert.equal(renewed.ok, true);
    const renewalReplay = await post<Result<SearchLease>>(roomId, "/renew", {
      operationId: "renew-once",
      leaseId: first.leaseId,
      subjectId: "alice",
      now: 39_000,
    });
    assert.deepEqual(renewalReplay, renewed);
    const expired = await post<Result<SearchLease>>(roomId, "/renew", {
      operationId: "renew-too-late",
      leaseId: first.leaseId,
      subjectId: "alice",
      now: 40_000,
    });
    assert.deepEqual(expired, { ok: false, error: "expired" });
  });

  it("should release both active slots when one lease disconnects", async () => {
    const roomId = "disconnect";
    const alice = await open(roomId, "alice", 1);
    await open(roomId, "bob", 2);
    await open(roomId, "charlie", 3);
    const first = await post<Result<Reserved>>(roomId, "/reserve", {
      now: 4,
      blockedPairs: [],
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.deepEqual(
      [
        first.data.assignment.first.subjectId,
        first.data.assignment.second.subjectId,
      ],
      ["alice", "bob"],
    );
    assert.equal(
      await post<boolean>(roomId, "/close", {
        leaseId: alice.leaseId,
        subjectId: "alice",
      }),
      true,
    );
    const next = await post<Result<Reserved>>(roomId, "/reserve", {
      now: 5,
      blockedPairs: [],
    });
    assert.equal(next.ok, true);
    if (!next.ok) return;
    assert.deepEqual(
      [
        next.data.assignment.first.subjectId,
        next.data.assignment.second.subjectId,
      ],
      ["bob", "charlie"],
    );
    assert.equal(
      await post<boolean>(roomId, "/finish", {
        assignmentId: first.data.assignmentId,
      }),
      false,
    );
  });

  it("should enforce new-user K=1 and private block exclusion", async () => {
    const roomId = "tier-block";
    await open(roomId, "new-user", 1, 1, 1);
    await open(roomId, "blocked", 2);
    await open(roomId, "allowed", 3);
    const first = await post<Result<Reserved>>(roomId, "/reserve", {
      now: 4,
      blockedPairs: [["new-user", "blocked"]],
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.deepEqual(
      [
        first.data.assignment.first.subjectId,
        first.data.assignment.second.subjectId,
      ],
      ["new-user", "allowed"],
    );
    assert.equal(
      await post<boolean>(roomId, "/finish", {
        assignmentId: first.data.assignmentId,
      }),
      true,
    );
    const second = await post<Result<Reserved>>(roomId, "/reserve", {
      now: 5,
      blockedPairs: [["new-user", "blocked"]],
    });
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.ok(
      ![
        second.data.assignment.first.subjectId,
        second.data.assignment.second.subjectId,
      ].includes("new-user"),
    );
    const third = await post<Result<Reserved>>(roomId, "/reserve", {
      now: 6,
      blockedPairs: [["new-user", "blocked"]],
    });
    assert.deepEqual(third, { ok: false, error: "not_found" });
  });

  it("should keep spent budget after finishing assignments in one round", async () => {
    const roomId = "budget";
    for (let index = 0; index < 4; index += 1) {
      await open(roomId, `subject-${index}`, index + 1);
    }
    const counts = new Map<string, number>();
    const pairs = new Set<string>();
    for (;;) {
      const result = await post<Result<Reserved>>(roomId, "/reserve", {
        now: 10,
        blockedPairs: [],
      });
      if (!result.ok) {
        assert.equal(result.error, "not_found");
        break;
      }
      const { assignment } = result.data;
      assert.ok(!pairs.has(assignment.pairVersionKey));
      pairs.add(assignment.pairVersionKey);
      for (const subject of [
        assignment.first.subjectId,
        assignment.second.subjectId,
      ]) {
        counts.set(subject, (counts.get(subject) ?? 0) + 1);
        assert.ok((counts.get(subject) ?? 0) <= 3);
      }
      assert.equal(
        await post<boolean>(roomId, "/finish", {
          assignmentId: result.data.assignmentId,
        }),
        true,
      );
    }
    assert.equal(pairs.size, 6);
    assert.deepEqual([...counts.values()], [3, 3, 3, 3]);
  });

  it("should measure ten synthetic rounds for N=10 and N=50", async (t) => {
    for (const size of [10, 50]) {
      const roomId = `load-${size}`;
      const pairKeys = new Set<string>();
      const roundCounts: number[] = [];
      const assignmentsBySubject = new Map<string, number>();
      let totalWaitMs = 0;
      for (let round = 0; round < 10; round += 1) {
        const now = round * 30_000 + 1;
        const leases = await Promise.all(
          Array.from({ length: size }, (_, index) =>
            open(
              roomId,
              `subject-${index}`,
              now + index,
              Math.floor(round / 3) + 1,
            ),
          ),
        );
        const reserveNow = now + size + 1;
        const active = new Set<string>();
        const spent = new Map<string, number>();
        const assignments: Reserved[] = [];
        for (;;) {
          const result = await post<Result<Reserved>>(roomId, "/reserve", {
            now: reserveNow,
            blockedPairs: [["subject-0", "subject-1"]],
          });
          if (!result.ok) {
            assert.equal(result.error, "not_found");
            break;
          }
          const { assignment } = result.data;
          const first = assignment.first.subjectId;
          const second = assignment.second.subjectId;
          assert.notEqual(first, second);
          assert.ok(!(first === "subject-0" && second === "subject-1"));
          assert.ok(!(first === "subject-1" && second === "subject-0"));
          assert.ok(!active.has(first) && !active.has(second));
          assert.ok(!pairKeys.has(assignment.pairVersionKey));
          pairKeys.add(assignment.pairVersionKey);
          for (const subject of [first, second]) {
            active.add(subject);
            spent.set(subject, (spent.get(subject) ?? 0) + 1);
            assignmentsBySubject.set(
              subject,
              (assignmentsBySubject.get(subject) ?? 0) + 1,
            );
            assert.ok((spent.get(subject) ?? 0) <= 3);
          }
          totalWaitMs +=
            reserveNow -
            assignment.first.joinedAt +
            reserveNow -
            assignment.second.joinedAt;
          assignments.push(result.data);
        }
        roundCounts.push(assignments.length);
        assert.ok(assignments.length > 0);
        assert.equal(active.size, assignments.length * 2);
        for (const item of assignments) {
          assert.equal(
            await post<boolean>(roomId, "/finish", {
              assignmentId: item.assignmentId,
            }),
            true,
          );
        }
        for (const lease of leases) {
          assert.equal(
            await post<boolean>(roomId, "/close", {
              leaseId: lease.leaseId,
              subjectId: lease.subjectId,
            }),
            true,
          );
        }
      }
      assert.equal(roundCounts.length, 10);
      assert.ok(
        roundCounts.every((count) => count <= Math.floor((size * 3) / 2)),
      );
      const totalAssignments = roundCounts.reduce(
        (sum, count) => sum + count,
        0,
      );
      assert.ok(totalAssignments > 0);
      const totals = Array.from(
        { length: size },
        (_, index) => assignmentsBySubject.get(`subject-${index}`) ?? 0,
      );
      t.diagnostic(
        JSON.stringify({
          size,
          rounds: roundCounts.length,
          roundCounts,
          totalAssignments,
          minAssignments: Math.min(...totals),
          maxAssignments: Math.max(...totals),
          meanSyntheticWaitMs: totalWaitMs / (totalAssignments * 2),
          reconnects: size * 9,
          traffic: trafficByRoom.get(roomId),
        }),
      );
    }
  });

  it("should restore leases and reservations after a local Worker restart", async () => {
    const roomId = "restart";
    const alice = await open(roomId, "alice", 1);
    await open(roomId, "bob", 2);
    const first = await post<Result<Reserved>>(roomId, "/reserve", {
      now: 3,
      blockedPairs: [],
    });
    assert.equal(first.ok, true);
    child.kill();
    await once(child, "exit");
    await startFixture();
    const second = await post<Result<Reserved>>(roomId, "/reserve", {
      now: 4,
      blockedPairs: [],
    });
    assert.deepEqual(second, { ok: false, error: "not_found" });
    const renewed = await post<Result<SearchLease>>(roomId, "/renew", {
      operationId: "restart-renew",
      leaseId: alice.leaseId,
      subjectId: "alice",
      now: 10,
    });
    assert.equal(renewed.ok, true);
    assert.equal(
      await post<boolean>(roomId, "/finish", {
        assignmentId: first.data.assignmentId,
      }),
      true,
    );
    const seen = await post<Result<Reserved>>(roomId, "/reserve", {
      now: 11,
      blockedPairs: [],
    });
    assert.deepEqual(seen, { ok: false, error: "not_found" });
  });
});
