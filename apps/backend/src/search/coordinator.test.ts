import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type Assignment,
  type CandidateLease,
  type CoordinatorState,
  pairVersionKey,
  releaseAssignment,
  selectAssignment,
} from "./coordinator.ts";

const NOW = 1_000;

function lease(
  index: number,
  overrides: Partial<CandidateLease> = {},
): CandidateLease {
  return {
    leaseId: `lease-${index}`,
    subjectId: `subject-${index}`,
    registrationVersion: 1,
    joinedAt: index,
    expiresAt: NOW + 30,
    ...overrides,
  };
}

function state(): CoordinatorState {
  return {
    roundId: "round-1",
    spentBySubject: {},
    activeSubjects: [],
    seenPairVersions: [],
  };
}

function select(
  leases: readonly CandidateLease[],
  current: CoordinatorState,
  blockedPairs: readonly (readonly [string, string])[] = [],
) {
  return selectAssignment({
    now: NOW,
    leases,
    blockedPairs,
    state: current,
    random: () => 0.5,
  });
}

describe("synthetic candidate assignment", () => {
  it("should respect K=3 and concurrency=1 for N=10 and N=50", () => {
    for (const size of [10, 50]) {
      const leases = Array.from({ length: size }, (_, index) =>
        lease(index, index === size - 1 ? { expiresAt: NOW } : {}),
      );
      const blockedPairs = [["subject-0", "subject-1"]] as const;
      let current = state();
      const allAssignments: Assignment[] = [];
      for (let wave = 0; wave < 3; wave += 1) {
        const waveAssignments: Assignment[] = [];
        for (;;) {
          const result = select(leases, current, blockedPairs);
          if (!result) break;
          current = result.state;
          waveAssignments.push(result.assignment);
          allAssignments.push(result.assignment);
          assert.equal(
            new Set(current.activeSubjects).size,
            current.activeSubjects.length,
          );
          assert.ok(
            Object.values(current.spentBySubject).every((spent) => spent <= 3),
          );
        }
        assert.ok(waveAssignments.length > 0);
        for (const assignment of waveAssignments) {
          current = releaseAssignment(current, assignment);
        }
        assert.equal(current.activeSubjects.length, 0);
      }
      assert.equal(
        new Set(allAssignments.map((item) => item.pairVersionKey)).size,
        allAssignments.length,
      );
      assert.ok(
        allAssignments.every(
          (item) => item.first.subjectId !== item.second.subjectId,
        ),
      );
      assert.ok(
        allAssignments.every(
          (item) =>
            item.first.subjectId !== `subject-${size - 1}` &&
            item.second.subjectId !== `subject-${size - 1}` &&
            !(
              [item.first.subjectId, item.second.subjectId].includes(
                "subject-0",
              ) &&
              [item.first.subjectId, item.second.subjectId].includes(
                "subject-1",
              )
            ),
        ),
      );
    }
  });

  it("should exclude self, duplicate subjects, expired leases and blocked pairs", () => {
    const duplicate = lease(1, {
      leaseId: "duplicate-1",
      subjectId: "subject-0",
    });
    const expired = lease(2, { expiresAt: NOW });
    assert.equal(select([lease(0), duplicate, expired], state()), null);
    assert.equal(
      select([lease(0), lease(1)], state(), [["subject-1", "subject-0"]]),
      null,
    );
    const assigned = select([lease(0), lease(1), lease(2)], state(), [
      ["subject-0", "subject-1"],
    ]);
    assert.equal(assigned?.assignment.second.subjectId, "subject-2");
  });

  it("should keep aborted assignments spent and reject the same pair version", () => {
    const pair = [lease(0), lease(1)];
    const first = select(pair, state());
    assert.ok(first);
    const nextRound = { ...first.state, roundId: "round-2" };
    assert.deepEqual(releaseAssignment(nextRound, first.assignment), nextRound);
    const released = releaseAssignment(first.state, first.assignment);
    assert.equal(select(pair, released), null);
    assert.equal(released.spentBySubject["subject-0"], 1);
    assert.equal(released.spentBySubject["subject-1"], 1);
    const revised = [pair[0], lease(1, { registrationVersion: 2 })];
    assert.notEqual(
      pairVersionKey(revised[0], revised[1]),
      first.assignment.pairVersionKey,
    );
    assert.ok(select(revised, released));
  });

  it("should select the longest waiter and randomize only equal wait times", () => {
    const leases = [
      lease(0, { joinedAt: 10 }),
      lease(1, { joinedAt: 20 }),
      lease(2, { joinedAt: 20 }),
    ];
    const ordered = select(leases, state());
    assert.equal(ordered?.assignment.first.subjectId, "subject-0");
    const ties = [0.9, 0.1, 0.5];
    const randomized = selectAssignment({
      now: NOW,
      leases: leases.map((item) => ({ ...item, joinedAt: 10 })),
      blockedPairs: [],
      state: state(),
      random: () => ties.shift() ?? 0.5,
    });
    assert.equal(randomized?.assignment.first.subjectId, "subject-1");
    assert.equal(randomized?.assignment.second.subjectId, "subject-2");
  });
});
