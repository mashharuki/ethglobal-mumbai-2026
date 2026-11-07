import { DurableObject } from "cloudflare:workers";
import {
  getAddress,
  type Hex,
  isAddress,
  isAddressEqual,
  verifyMessage,
} from "viem";
import { createSiweMessage, parseSiweMessage } from "viem/siwe";

const CHALLENGE_LIFETIME_MS = 5 * 60_000;
const SESSION_LIFETIME_MS = 15 * 60_000;
const RATE_WINDOW_MS = 60_000;
const SEPOLIA_CHAIN_ID = 11155111;

type AuthError = "invalid" | "expired" | "used" | "rate_limited";
type AuthResult<T> = { ok: true; data: T } | { ok: false; error: AuthError };

export type AuthChallenge = { message: string; expiresAt: string };
export type AuthSession = { token: string; expiresAt: string };
export type PrivateOperation = {
  operationId: string;
  kind: "registration" | "invite" | "review" | "block" | "settlement";
  status: "pending" | "confirmed" | "failed";
  createdAt: string;
  updatedAt: string;
  errorCode?: string;
};

type ChallengeRow = {
  message: string;
  expires_at: number;
  used: number;
};

type SessionRow = { token_hash: string; expires_at: number };
type OperationRow = { body: string };

function randomHex(byteCount: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteCount));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function hashSessionToken(token: string): Promise<string> {
  const input = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function equalTokenHash(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  for (let index = 0; index < 64; index += 1) {
    difference |=
      (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export function isExpectedSiweMessage(
  message: string,
  address: string,
  origin: string,
  now: number,
): boolean {
  const parsed = parseSiweMessage(message);
  if (!parsed.address || !isAddress(parsed.address, { strict: false }))
    return false;
  if (!isAddress(address, { strict: false })) return false;
  if (!isAddressEqual(parsed.address, address)) return false;
  if (parsed.domain !== new URL(origin).host || parsed.uri !== origin)
    return false;
  if (parsed.chainId !== SEPOLIA_CHAIN_ID || parsed.version !== "1")
    return false;
  if (!parsed.nonce || !/^[a-zA-Z0-9]{8,}$/.test(parsed.nonce)) return false;
  const issuedAt = parsed.issuedAt?.getTime();
  const expiresAt = parsed.expirationTime?.getTime();
  if (!issuedAt || !expiresAt || Number.isNaN(issuedAt + expiresAt))
    return false;
  return (
    issuedAt <= now + 60_000 &&
    expiresAt > now &&
    expiresAt - issuedAt <= CHALLENGE_LIFETIME_MS
  );
}

export function parseSessionCookie(value: string | undefined): {
  address: string;
  token: string;
} | null {
  const match = /^(0x[a-f0-9]{40})\.([a-f0-9]{64})$/.exec(value ?? "");
  if (!match || !isAddress(match[1], { strict: false })) return null;
  return { address: match[1], token: match[2] };
}

export class AuthStore extends DurableObject<CloudflareBindings> {
  constructor(ctx: DurableObjectState, env: CloudflareBindings) {
    super(ctx, env);
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS challenges (nonce TEXT PRIMARY KEY, message TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0)",
    );
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS rate_limits (kind TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL)",
    );
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY CHECK (id = 1), token_hash TEXT NOT NULL, expires_at INTEGER NOT NULL)",
    );
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS operations (operation_id TEXT PRIMARY KEY, body TEXT NOT NULL)",
    );
  }

  private consumeRate(kind: string, limit: number, now: number): boolean {
    const row = this.ctx.storage.sql
      .exec<{ count: number }>(
        "INSERT INTO rate_limits (kind, window_start, count) VALUES (?, ?, 1) ON CONFLICT(kind) DO UPDATE SET count = CASE WHEN window_start <= ? THEN 1 ELSE count + 1 END, window_start = CASE WHEN window_start <= ? THEN excluded.window_start ELSE window_start END RETURNING count",
        kind,
        now,
        now - RATE_WINDOW_MS,
        now - RATE_WINDOW_MS,
      )
      .one();
    return row.count <= limit;
  }

  issueChallenge(address: string, origin: string): AuthResult<AuthChallenge> {
    const now = Date.now();
    if (!isAddress(address, { strict: false }))
      return { ok: false, error: "invalid" };
    if (!this.consumeRate("challenge", 5, now))
      return { ok: false, error: "rate_limited" };
    const nonce = randomHex(16);
    const expiresAt = new Date(now + CHALLENGE_LIFETIME_MS);
    const message = createSiweMessage({
      address: getAddress(address),
      chainId: SEPOLIA_CHAIN_ID,
      domain: new URL(origin).host,
      uri: origin,
      version: "1",
      nonce,
      issuedAt: new Date(now),
      expirationTime: expiresAt,
      statement:
        "Sign in to Secret Tinder. This does not approve registration or settlement.",
    });
    this.ctx.storage.sql.exec(
      "DELETE FROM challenges WHERE expires_at <= ?",
      now,
    );
    this.ctx.storage.sql.exec(
      "INSERT INTO challenges (nonce, message, expires_at) VALUES (?, ?, ?)",
      nonce,
      message,
      expiresAt.getTime(),
    );
    return { ok: true, data: { message, expiresAt: expiresAt.toISOString() } };
  }

  async createSession(
    message: string,
    signature: Hex,
    origin: string,
  ): Promise<AuthResult<AuthSession>> {
    const now = Date.now();
    if (!this.consumeRate("session", 10, now))
      return { ok: false, error: "rate_limited" };
    const parsed = parseSiweMessage(message);
    if (!parsed.address || !parsed.nonce)
      return { ok: false, error: "invalid" };
    const row = this.ctx.storage.sql
      .exec<ChallengeRow>(
        "SELECT message, expires_at, used FROM challenges WHERE nonce = ?",
        parsed.nonce,
      )
      .toArray()[0];
    if (!row || row.message !== message) return { ok: false, error: "invalid" };
    if (row.used) return { ok: false, error: "used" };
    if (row.expires_at <= now) return { ok: false, error: "expired" };
    if (!isExpectedSiweMessage(message, parsed.address, origin, now)) {
      return { ok: false, error: "invalid" };
    }
    let isValidSignature = false;
    try {
      isValidSignature = await verifyMessage({
        address: parsed.address,
        message,
        signature,
      });
    } catch {
      return { ok: false, error: "invalid" };
    }
    if (!isValidSignature) return { ok: false, error: "invalid" };
    const consumed = this.ctx.storage.sql
      .exec<{ nonce: string }>(
        "UPDATE challenges SET used = 1 WHERE nonce = ? AND used = 0 AND expires_at > ? RETURNING nonce",
        parsed.nonce,
        Date.now(),
      )
      .toArray();
    if (consumed.length !== 1) return { ok: false, error: "used" };
    const token = randomHex(32);
    const tokenHash = await hashSessionToken(token);
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);
    this.ctx.storage.sql.exec(
      "INSERT INTO sessions (id, token_hash, expires_at) VALUES (1, ?, ?) ON CONFLICT(id) DO UPDATE SET token_hash = excluded.token_hash, expires_at = excluded.expires_at",
      tokenHash,
      expiresAt.getTime(),
    );
    return { ok: true, data: { token, expiresAt: expiresAt.toISOString() } };
  }

  hasSession(tokenHash: string): boolean {
    const row = this.ctx.storage.sql
      .exec<SessionRow>(
        "SELECT token_hash, expires_at FROM sessions WHERE id = 1",
      )
      .toArray()[0];
    return (
      equalTokenHash(tokenHash, row?.token_hash ?? "0".repeat(64)) &&
      !!row &&
      row.expires_at > Date.now()
    );
  }

  getPrivateOperation(operationId: string): PrivateOperation | null {
    const row = this.ctx.storage.sql
      .exec<OperationRow>(
        "SELECT body FROM operations WHERE operation_id = ?",
        operationId,
      )
      .toArray()[0];
    return row ? (JSON.parse(row.body) as PrivateOperation) : null;
  }

  putPrivateOperation(operation: PrivateOperation): void {
    this.ctx.storage.sql.exec(
      "INSERT INTO operations (operation_id, body) VALUES (?, ?) ON CONFLICT(operation_id) DO UPDATE SET body = excluded.body",
      operation.operationId,
      JSON.stringify(operation),
    );
  }
}
