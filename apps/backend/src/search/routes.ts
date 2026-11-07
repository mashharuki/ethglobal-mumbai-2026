import { type Context, Hono } from "hono";
import { getCookie } from "hono/cookie";
import {
  operationIdSchema,
  type SearchLeaseRequest,
  searchLeaseRequestSchema,
} from "shared";
import { getAddress } from "viem";
import { readBoundedJsonBody } from "../auth/request-body.ts";
import { getAuthenticatedAddress } from "../auth/session.ts";
import { isCredentialCurrent, type SearchAdmission } from "./admission.ts";
import { readDemoParticipationCredential } from "./participation-reader.ts";

type SearchContext = Context<{ Bindings: CloudflareBindings }>;
export type SearchAdmissionGate = (
  subject: `0x${string}`,
  request: SearchLeaseRequest,
  nowMs: number,
) => Promise<SearchAdmission>;

async function publicParticipationGate(
  subject: `0x${string}`,
  request: SearchLeaseRequest,
  nowMs: number,
): Promise<SearchAdmission> {
  const credential = await readDemoParticipationCredential(subject);
  if (!credential.ok) return credential;
  if (!isCredentialCurrent(credential.data, subject, request, nowMs)) {
    return { ok: false, error: "ineligible" };
  }
  // Registration proof, owner signature and confirmed deposit readers are pending.
  return { ok: false, error: "unavailable" };
}

function searchError(
  c: SearchContext,
  status: 401 | 403 | 409 | 422 | 503,
  code: string,
): Response {
  return c.json(
    { code, message: code.toLowerCase().replaceAll("_", " ") },
    status,
  );
}

function isSameOrigin(c: SearchContext): boolean {
  const url = new URL(c.req.url);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  return (
    (url.protocol === "https:" || isLocal) &&
    c.req.header("Origin") === url.origin
  );
}

async function createLease(
  c: SearchContext,
  gate: SearchAdmissionGate,
): Promise<Response> {
  if (!isSameOrigin(c)) return searchError(c, 422, "INVALID_INPUT");
  const subject = await getAuthenticatedAddress(
    c.env,
    getCookie(c, "st_session"),
  );
  if (!subject) return searchError(c, 401, "UNAUTHENTICATED");
  const operationId = operationIdSchema.safeParse(
    c.req.header("X-Operation-Id"),
  );
  const parsed = searchLeaseRequestSchema.safeParse(
    await readBoundedJsonBody(c.req.raw, 8192),
  );
  if (!operationId.success || !parsed.success)
    return searchError(c, 422, "INVALID_INPUT");
  const request: SearchLeaseRequest = parsed.data;
  const nowMs = Date.now();
  const admission = await gate(getAddress(subject), request, nowMs);
  if (!admission.ok) {
    return searchError(
      c,
      admission.error === "ineligible" ? 403 : 503,
      admission.error === "ineligible" ? "INELIGIBLE" : "UNAVAILABLE",
    );
  }
  const result = await c.env.SEARCH_COORDINATOR.getByName(
    "search-global",
  ).openLease({
    operationId: operationId.data,
    subjectId: subject.toLowerCase(),
    registrationVersion: admission.data.registrationVersion,
    maxPerRound: admission.data.maxPerRound,
    maxExpiresAt: admission.data.maxExpiresAt,
    now: nowMs,
  });
  if (!result.ok) {
    return searchError(
      c,
      result.error === "conflict" ? 409 : 422,
      result.error === "conflict" ? "CONFLICT" : "INVALID_INPUT",
    );
  }
  return c.json(
    {
      leaseId: result.data.leaseId,
      expiresAt: new Date(result.data.expiresAt).toISOString(),
    },
    202,
  );
}

export function createSearchRoutes(
  gate: SearchAdmissionGate = publicParticipationGate,
): Hono<{ Bindings: CloudflareBindings }> {
  const routes = new Hono<{ Bindings: CloudflareBindings }>();
  routes.post("/search-leases", (c) => createLease(c, gate));
  return routes;
}

export const searchRoutes = createSearchRoutes();
