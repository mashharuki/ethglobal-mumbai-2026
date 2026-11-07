import { DurableObject } from "cloudflare:workers";
import {
  type Assignment,
  type CandidateLease,
  type CoordinatorState,
  selectAssignment,
} from "./coordinator.ts";

const LEASE_MS = 30_000;
const ROUND_MS = 30_000;
const ASSIGNMENT_MS = 30_000;

type SearchError = "invalid" | "conflict" | "expired" | "not_found";
type SearchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: SearchError };

export type SearchLease = CandidateLease & {
  maxExpiresAt: number;
  maxPerRound: 1 | 3;
};

export type OpenLeaseInput = {
  operationId: string;
  subjectId: string;
  registrationVersion: number;
  maxPerRound: 1 | 3;
  maxExpiresAt: number;
  now: number;
};

export type RenewLeaseInput = {
  operationId: string;
  leaseId: string;
  subjectId: string;
  now: number;
};

type LeaseRow = {
  lease_id: string;
  subject_id: string;
  registration_version: number;
  joined_at: number;
  expires_at: number;
  max_expires_at: number;
  max_per_round: 1 | 3;
};

type OperationRow = { fingerprint: string; result_json: string };
type SpentRow = { subject_id: string; spent: number };
type SubjectRow = { subject_id: string };
type PairRow = { pair_version_key: string };
type AssignmentRow = {
  assignment_id: string;
  round_id: string;
  first_lease_id: string;
  second_lease_id: string;
  pair_version_key: string;
  expires_at: number;
};

function isValidId(value: string): boolean {
  return value.length > 0 && value.length <= 128;
}

function isValidTime(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function toSearchLease(row: LeaseRow): SearchLease {
  return {
    leaseId: row.lease_id,
    subjectId: row.subject_id,
    registrationVersion: row.registration_version,
    joinedAt: row.joined_at,
    expiresAt: row.expires_at,
    maxExpiresAt: row.max_expires_at,
    maxPerRound: row.max_per_round,
  };
}

function validateOpenInput(input: OpenLeaseInput): boolean {
  return (
    isValidId(input.operationId) &&
    isValidId(input.subjectId) &&
    Number.isSafeInteger(input.registrationVersion) &&
    input.registrationVersion > 0 &&
    (input.maxPerRound === 1 || input.maxPerRound === 3) &&
    isValidTime(input.now) &&
    isValidTime(input.maxExpiresAt) &&
    input.maxExpiresAt > input.now
  );
}

export class SearchCoordinator extends DurableObject<CloudflareBindings> {
  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env);
    const sql = this.ctx.storage.sql;
    sql.exec(
      "CREATE TABLE IF NOT EXISTS leases (lease_id TEXT PRIMARY KEY, subject_id TEXT NOT NULL UNIQUE, registration_version INTEGER NOT NULL, joined_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, max_expires_at INTEGER NOT NULL, max_per_round INTEGER NOT NULL)",
    );
    sql.exec(
      "CREATE TABLE IF NOT EXISTS lease_operations (operation_id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, result_json TEXT NOT NULL)",
    );
    sql.exec(
      "CREATE TABLE IF NOT EXISTS budgets (round_id TEXT NOT NULL, subject_id TEXT NOT NULL, spent INTEGER NOT NULL, PRIMARY KEY (round_id, subject_id))",
    );
    sql.exec(
      "CREATE TABLE IF NOT EXISTS active_slots (subject_id TEXT PRIMARY KEY, assignment_id TEXT NOT NULL, expires_at INTEGER NOT NULL)",
    );
    sql.exec(
      "CREATE TABLE IF NOT EXISTS seen_pairs (pair_version_key TEXT PRIMARY KEY)",
    );
    sql.exec(
      "CREATE TABLE IF NOT EXISTS assignments (assignment_id TEXT PRIMARY KEY, round_id TEXT NOT NULL, first_lease_id TEXT NOT NULL, second_lease_id TEXT NOT NULL, pair_version_key TEXT NOT NULL, expires_at INTEGER NOT NULL)",
    );
  }

  private replayLease(
    operationId: string,
    fingerprint: string,
  ): SearchResult<SearchLease> | null {
    const row = this.ctx.storage.sql
      .exec<OperationRow>(
        "SELECT fingerprint, result_json FROM lease_operations WHERE operation_id = ?",
        operationId,
      )
      .toArray()[0];
    if (!row) return null;
    if (row.fingerprint !== fingerprint)
      return { ok: false, error: "conflict" };
    return { ok: true, data: JSON.parse(row.result_json) as SearchLease };
  }

  private recordLease(
    operationId: string,
    fingerprint: string,
    lease: SearchLease,
  ): void {
    this.ctx.storage.sql.exec(
      "INSERT INTO lease_operations (operation_id, fingerprint, result_json) VALUES (?, ?, ?)",
      operationId,
      fingerprint,
      JSON.stringify(lease),
    );
  }

  private expireState(now: number): void {
    const sql = this.ctx.storage.sql;
    sql.exec("DELETE FROM leases WHERE expires_at <= ?", now);
    sql.exec("DELETE FROM active_slots WHERE expires_at <= ?", now);
    sql.exec("DELETE FROM assignments WHERE expires_at <= ?", now);
  }

  openLease(input: OpenLeaseInput): SearchResult<SearchLease> {
    if (!validateOpenInput(input)) return { ok: false, error: "invalid" };
    const fingerprint = JSON.stringify({
      subjectId: input.subjectId,
      registrationVersion: input.registrationVersion,
      maxPerRound: input.maxPerRound,
      maxExpiresAt: input.maxExpiresAt,
    });
    return this.ctx.storage.transactionSync(() => {
      const replay = this.replayLease(input.operationId, fingerprint);
      if (replay) return replay;
      this.expireState(input.now);
      const existing = this.ctx.storage.sql
        .exec<LeaseRow>(
          "SELECT * FROM leases WHERE subject_id = ?",
          input.subjectId,
        )
        .toArray()[0];
      if (existing) return { ok: false, error: "conflict" };
      const lease: SearchLease = {
        leaseId: crypto.randomUUID(),
        subjectId: input.subjectId,
        registrationVersion: input.registrationVersion,
        joinedAt: input.now,
        expiresAt: Math.min(input.now + LEASE_MS, input.maxExpiresAt),
        maxExpiresAt: input.maxExpiresAt,
        maxPerRound: input.maxPerRound,
      };
      this.ctx.storage.sql.exec(
        "INSERT INTO leases VALUES (?, ?, ?, ?, ?, ?, ?)",
        lease.leaseId,
        lease.subjectId,
        lease.registrationVersion,
        lease.joinedAt,
        lease.expiresAt,
        lease.maxExpiresAt,
        lease.maxPerRound,
      );
      this.recordLease(input.operationId, fingerprint, lease);
      return { ok: true, data: lease };
    });
  }

  renewLease(input: RenewLeaseInput): SearchResult<SearchLease> {
    if (
      !isValidId(input.operationId) ||
      !isValidId(input.leaseId) ||
      !isValidId(input.subjectId) ||
      !isValidTime(input.now)
    )
      return { ok: false, error: "invalid" };
    const fingerprint = JSON.stringify({
      leaseId: input.leaseId,
      subjectId: input.subjectId,
    });
    return this.ctx.storage.transactionSync(() => {
      const replay = this.replayLease(input.operationId, fingerprint);
      if (replay) return replay;
      const row = this.ctx.storage.sql
        .exec<LeaseRow>(
          "SELECT * FROM leases WHERE lease_id = ? AND subject_id = ?",
          input.leaseId,
          input.subjectId,
        )
        .toArray()[0];
      if (!row) return { ok: false, error: "not_found" };
      if (row.expires_at <= input.now || row.max_expires_at <= input.now)
        return { ok: false, error: "expired" };
      const lease = toSearchLease(row);
      lease.expiresAt = Math.min(input.now + LEASE_MS, row.max_expires_at);
      this.ctx.storage.sql.exec(
        "UPDATE leases SET expires_at = ? WHERE lease_id = ?",
        lease.expiresAt,
        lease.leaseId,
      );
      this.recordLease(input.operationId, fingerprint, lease);
      return { ok: true, data: lease };
    });
  }

  closeLease(leaseId: string, subjectId: string): boolean {
    if (!isValidId(leaseId) || !isValidId(subjectId)) return false;
    return this.ctx.storage.transactionSync(() => {
      const deleted = this.ctx.storage.sql
        .exec(
          "DELETE FROM leases WHERE lease_id = ? AND subject_id = ? RETURNING lease_id",
          leaseId,
          subjectId,
        )
        .toArray();
      if (deleted.length === 0) return false;
      const assignment = this.ctx.storage.sql
        .exec<{ assignment_id: string }>(
          "SELECT assignment_id FROM active_slots WHERE subject_id = ?",
          subjectId,
        )
        .toArray()[0];
      if (assignment) {
        this.ctx.storage.sql.exec(
          "DELETE FROM assignments WHERE assignment_id = ?",
          assignment.assignment_id,
        );
        this.ctx.storage.sql.exec(
          "DELETE FROM active_slots WHERE assignment_id = ?",
          assignment.assignment_id,
        );
      }
      return true;
    });
  }

  private readSelectionState(
    now: number,
    roundId: string,
  ): {
    leases: SearchLease[];
    state: CoordinatorState;
  } {
    const sql = this.ctx.storage.sql;
    const leases = sql
      .exec<LeaseRow>("SELECT * FROM leases WHERE expires_at > ?", now)
      .toArray()
      .map(toSearchLease);
    const spent = sql
      .exec<SpentRow>(
        "SELECT subject_id, spent FROM budgets WHERE round_id = ?",
        roundId,
      )
      .toArray();
    return {
      leases,
      state: {
        roundId,
        spentBySubject: Object.fromEntries(
          spent.map((row) => [row.subject_id, row.spent]),
        ),
        activeSubjects: sql
          .exec<SubjectRow>("SELECT subject_id FROM active_slots")
          .toArray()
          .map((row) => row.subject_id),
        seenPairVersions: sql
          .exec<PairRow>("SELECT pair_version_key FROM seen_pairs")
          .toArray()
          .map((row) => row.pair_version_key),
      },
    };
  }

  private persistAssignment(
    assignmentId: string,
    assignment: Assignment,
    expiresAt: number,
  ): void {
    const sql = this.ctx.storage.sql;
    sql.exec(
      "INSERT INTO assignments VALUES (?, ?, ?, ?, ?, ?)",
      assignmentId,
      assignment.roundId,
      assignment.first.leaseId,
      assignment.second.leaseId,
      assignment.pairVersionKey,
      expiresAt,
    );
    for (const lease of [assignment.first, assignment.second]) {
      sql.exec(
        "INSERT INTO budgets VALUES (?, ?, 1) ON CONFLICT(round_id, subject_id) DO UPDATE SET spent = spent + 1",
        assignment.roundId,
        lease.subjectId,
      );
      sql.exec(
        "INSERT INTO active_slots VALUES (?, ?, ?)",
        lease.subjectId,
        assignmentId,
        expiresAt,
      );
    }
    sql.exec("INSERT INTO seen_pairs VALUES (?)", assignment.pairVersionKey);
  }

  // Internal RPC only. The future HTTP route must supply server time and verified blocks/tier.
  reserveNextAssignment(
    now: number,
    blockedPairs: readonly (readonly [string, string])[],
  ): SearchResult<{
    assignmentId: string;
    assignment: Assignment;
    expiresAt: number;
  }> {
    if (!isValidTime(now) || blockedPairs.length > 10_000)
      return { ok: false, error: "invalid" };
    return this.ctx.storage.transactionSync(() => {
      this.expireState(now);
      const roundId = String(Math.floor(now / ROUND_MS));
      const { leases, state } = this.readSelectionState(now, roundId);
      const selected = selectAssignment({
        now,
        leases,
        blockedPairs,
        state,
        maxBySubject: Object.fromEntries(
          leases.map((lease) => [lease.subjectId, lease.maxPerRound]),
        ),
      });
      if (!selected) return { ok: false, error: "not_found" };
      const assignmentId = crypto.randomUUID();
      const expiresAt = Math.min(
        now + ASSIGNMENT_MS,
        selected.assignment.first.expiresAt,
        selected.assignment.second.expiresAt,
      );
      this.persistAssignment(assignmentId, selected.assignment, expiresAt);
      return {
        ok: true,
        data: { assignmentId, assignment: selected.assignment, expiresAt },
      };
    });
  }

  finishAssignment(assignmentId: string): boolean {
    if (!isValidId(assignmentId)) return false;
    return this.ctx.storage.transactionSync(() => {
      const row = this.ctx.storage.sql
        .exec<AssignmentRow>(
          "SELECT * FROM assignments WHERE assignment_id = ?",
          assignmentId,
        )
        .toArray()[0];
      if (!row) return false;
      this.ctx.storage.sql.exec(
        "DELETE FROM active_slots WHERE assignment_id = ?",
        assignmentId,
      );
      this.ctx.storage.sql.exec(
        "DELETE FROM assignments WHERE assignment_id = ?",
        assignmentId,
      );
      return true;
    });
  }
}
