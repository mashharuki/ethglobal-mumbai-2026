import { type Context, Hono } from "hono";
import { getCookie } from "hono/cookie";
import {
  operationIdSchema,
  reviewCaseIdSchema,
  reviewDecisionRequestSchema,
  reviewResponseRequestSchema,
} from "shared";
import { getAuthenticatedAddress, getAuthStore } from "../auth/session.ts";
import {
  appealReview,
  castAppealVote,
  castPrimaryVote,
  getPrivateReviewCase,
  type Mutation,
  type ReviewCase,
  submitRebuttal,
} from "./review.ts";

type ReviewContext = Context<{ Bindings: CloudflareBindings }>;
type ReviewErrorCode =
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_INPUT"
  | "UNAVAILABLE";

export const reviewRoutes = new Hono<{ Bindings: CloudflareBindings }>();

reviewRoutes.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

function reviewError(
  c: ReviewContext,
  status: 401 | 404 | 409 | 422 | 503,
  code: ReviewErrorCode,
): Response {
  return c.json(
    { code, message: code.toLowerCase().replaceAll("_", " ") },
    status,
  );
}

function isSameOrigin(c: ReviewContext): boolean {
  const url = new URL(c.req.url);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  return (
    (url.protocol === "https:" || isLocal) &&
    c.req.header("Origin") === url.origin
  );
}

async function readReviewBody(c: ReviewContext): Promise<unknown> {
  if (!c.req.header("Content-Type")?.startsWith("application/json"))
    return null;
  const text = await c.req.text();
  if (text.length > 4096) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function getReviewStore(env: CloudflareBindings) {
  return env.AUTH_STORE.getByName("review-ledger");
}

function toIso(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

reviewRoutes.get("/review-cases/:id", async (c) => {
  const actor = await getAuthenticatedAddress(
    c.env,
    getCookie(c, "st_session"),
  );
  if (!actor) return reviewError(c, 401, "UNAUTHENTICATED");
  const caseId = reviewCaseIdSchema.safeParse(c.req.param("id"));
  if (!caseId.success) return reviewError(c, 404, "NOT_FOUND");
  const review = await getReviewStore(c.env).getReviewCase(caseId.data);
  if (!review) return reviewError(c, 404, "NOT_FOUND");
  const visible = getPrivateReviewCase(review, actor);
  if (!visible.ok) return reviewError(c, 404, "NOT_FOUND");
  const detail = visible.data;
  return c.json({
    caseId: detail.caseId,
    policyVersion: detail.policyVersion,
    state: detail.state,
    revision: detail.revision,
    openedAt: toIso(detail.openedAt),
    syntheticSummary: detail.syntheticSummary,
    ...(detail.responseDeadline === null
      ? {}
      : { responseDeadline: toIso(detail.responseDeadline) }),
    ...(detail.appealDeadline === null
      ? {}
      : { appealDeadline: toIso(detail.appealDeadline) }),
    ...(detail.suspendedUntil === null
      ? {}
      : { suspendedUntil: toIso(detail.suspendedUntil) }),
  });
});

async function mutateReview(
  c: ReviewContext,
  kind: "response" | "appeal",
): Promise<Response> {
  if (!isSameOrigin(c)) return reviewError(c, 422, "INVALID_INPUT");
  const actor = await getAuthenticatedAddress(
    c.env,
    getCookie(c, "st_session"),
  );
  if (!actor) return reviewError(c, 401, "UNAUTHENTICATED");
  const caseId = reviewCaseIdSchema.safeParse(c.req.param("id"));
  const operationId = operationIdSchema.safeParse(
    c.req.header("X-Operation-Id"),
  );
  const body = reviewResponseRequestSchema.safeParse(await readReviewBody(c));
  if (!caseId.success || !operationId.success || !body.success)
    return reviewError(c, 422, "INVALID_INPUT");
  const store = getReviewStore(c.env);
  const review = await store.getReviewCase(caseId.data);
  if (!review) return reviewError(c, 404, "NOT_FOUND");
  const input: Mutation = {
    operationId: operationId.data,
    expectedRevision: body.data.expectedRevision,
    fingerprint: `${kind}:${body.data.fixtureId}`,
  };
  const result =
    kind === "response"
      ? submitRebuttal(
          review,
          actor,
          body.data.fixtureId,
          Math.floor(Date.now() / 1000),
          input,
        )
      : appealReview(
          review,
          actor,
          body.data.fixtureId,
          Math.floor(Date.now() / 1000),
          input,
        );
  if (!result.ok) {
    if (result.error === "FORBIDDEN" || result.error === "NOT_FOUND")
      return reviewError(c, 404, "NOT_FOUND");
    return reviewError(
      c,
      result.error === "INVALID_INPUT" ? 422 : 409,
      result.error === "INVALID_INPUT" ? "INVALID_INPUT" : "CONFLICT",
    );
  }
  if (result.data.revision !== review.revision) {
    const isSaved = await store.putReviewCase(result.data, review.revision);
    if (!isSaved) {
      const latest = await store.getReviewCase(caseId.data);
      if (latest?.operationFingerprints[operationId.data] !== input.fingerprint)
        return reviewError(c, 409, "CONFLICT");
    }
  }
  await getAuthStore(c.env, actor).putPrivateOperation({
    operationId: operationId.data,
    kind: "review",
    status: "confirmed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return c.json(
    { operationId: operationId.data, status: "pending" as const },
    202,
  );
}

reviewRoutes.post("/review-cases/:id/responses", (c) =>
  mutateReview(c, "response"),
);
reviewRoutes.post("/review-cases/:id/appeals", (c) =>
  mutateReview(c, "appeal"),
);

function decideReview(
  review: ReviewCase,
  actor: string,
  input: ReturnType<typeof reviewDecisionRequestSchema.parse>,
  mutation: Mutation,
) {
  if (input.policyVersion !== review.policy.version) return null;
  const now = Math.floor(Date.now() / 1000);
  if (input.decision === "reverse" || input.decision === "uphold") {
    if (input.fixtureId !== review.appealFixtureId) return null;
    return castAppealVote(review, actor, input.decision, now, mutation);
  }
  if (input.fixtureId !== review.fixtureId) return null;
  return castPrimaryVote(
    review,
    actor,
    {
      outcome: input.decision,
      fixtureId: input.fixtureId,
      suspendedUntil: input.suspendedUntil
        ? Math.floor(Date.parse(input.suspendedUntil) / 1000)
        : null,
    },
    now,
    mutation,
  );
}

async function saveDecision(
  c: ReviewContext,
  review: ReviewCase,
  next: ReviewCase,
  actor: string,
  mutation: Mutation,
): Promise<Response> {
  const store = getReviewStore(c.env);
  if (next.revision !== review.revision) {
    const isSaved = await store.putReviewCase(next, review.revision);
    if (!isSaved) {
      const latest = await store.getReviewCase(review.caseId);
      if (
        latest?.operationFingerprints[mutation.operationId] !==
        mutation.fingerprint
      )
        return reviewError(c, 409, "CONFLICT");
    }
  }
  const now = new Date().toISOString();
  await getAuthStore(c.env, actor).putPrivateOperation({
    operationId: mutation.operationId,
    kind: "review",
    status: "confirmed",
    createdAt: now,
    updatedAt: now,
  });
  return c.json(
    { operationId: mutation.operationId, status: "pending" as const },
    202,
  );
}

reviewRoutes.post("/review-cases/:id/decisions", async (c) => {
  if (!isSameOrigin(c)) return reviewError(c, 422, "INVALID_INPUT");
  const actor = await getAuthenticatedAddress(
    c.env,
    getCookie(c, "st_session"),
  );
  if (!actor) return reviewError(c, 401, "UNAUTHENTICATED");
  const caseId = reviewCaseIdSchema.safeParse(c.req.param("id"));
  const operationId = operationIdSchema.safeParse(
    c.req.header("X-Operation-Id"),
  );
  const body = reviewDecisionRequestSchema.safeParse(await readReviewBody(c));
  if (!caseId.success || !operationId.success || !body.success)
    return reviewError(c, 422, "INVALID_INPUT");
  const store = getReviewStore(c.env);
  const review = await store.getReviewCase(caseId.data);
  if (!review) return reviewError(c, 404, "NOT_FOUND");
  const mutation: Mutation = {
    operationId: operationId.data,
    expectedRevision: body.data.expectedRevision,
    fingerprint: `decision:${body.data.policyVersion}:${body.data.decision}:${body.data.fixtureId}:${body.data.suspendedUntil ?? ""}`,
  };
  const result = decideReview(review, actor, body.data, mutation);
  if (!result) return reviewError(c, 422, "INVALID_INPUT");
  if (!result.ok) {
    if (result.error === "FORBIDDEN" || result.error === "NOT_FOUND")
      return reviewError(c, 404, "NOT_FOUND");
    return reviewError(
      c,
      result.error === "INVALID_INPUT" ? 422 : 409,
      result.error === "INVALID_INPUT" ? "INVALID_INPUT" : "CONFLICT",
    );
  }
  return saveDecision(c, review, result.data, actor, mutation);
});
