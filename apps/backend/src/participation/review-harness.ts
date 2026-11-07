// Local Wrangler entry point used only by review-api.test.ts; wrangler.jsonc still deploys src/index.ts.
import { Hono } from "hono";
import { authChallengeRequestSchema, reviewCaseIdSchema } from "shared";
import app, { AuthStore } from "../index.ts";
import {
  appealReview,
  beginReview,
  castAppealVote,
  castPrimaryVote,
  getEffectiveSuspension,
  type Mutation,
  type ReviewCase,
  type ReviewResult,
  receiveReviewCase,
  recordDecisionNotice,
  recordReviewNotice,
} from "./review.ts";

const harness = new Hono<{ Bindings: CloudflareBindings }>();

const reporter = "0x1111111111111111111111111111111111111111";
const first = "0x3333333333333333333333333333333333333333";
const second = "0x4444444444444444444444444444444444444444";
const appealFirst = "0x6666666666666666666666666666666666666666";
const appealSecond = "0x7777777777777777777777777777777777777777";

function mutation(review: ReviewCase, label: string): Mutation {
  return {
    operationId: crypto.randomUUID(),
    expectedRevision: review.revision,
    fingerprint: `fixture:${label}`,
  };
}

async function saveStep(
  store: DurableObjectStub<AuthStore>,
  previous: ReviewCase,
  result: ReviewResult<ReviewCase>,
): Promise<ReviewCase | null> {
  if (!result.ok) return null;
  return (await store.putReviewCase(result.data, previous.revision))
    ? result.data
    : null;
}

async function advanceReview(
  store: DurableObjectStub<AuthStore>,
  received: ReviewCase,
  state: "reviewing" | "reviewing-ready" | "decided",
  now: number,
): Promise<ReviewCase | null> {
  const started = await saveStep(
    store,
    received,
    beginReview(received, first, mutation(received, "begin")),
  );
  if (!started) return null;
  const deliveredAt = state === "reviewing" ? now : now - 7_200;
  const reviewing = await saveStep(
    store,
    started,
    recordReviewNotice(
      started,
      deliveredAt,
      mutation(started, "review-notice"),
    ),
  );
  if (!reviewing || state !== "decided") return reviewing;
  const choice = {
    outcome: "suspend" as const,
    fixtureId: "synthetic",
    suspendedUntil: now + 7_200,
  };
  const one = await saveStep(
    store,
    reviewing,
    castPrimaryVote(
      reviewing,
      first,
      choice,
      now - 3_600,
      mutation(reviewing, "vote-one"),
    ),
  );
  if (!one) return null;
  const two = await saveStep(
    store,
    one,
    castPrimaryVote(
      one,
      second,
      choice,
      now - 3_599,
      mutation(one, "vote-two"),
    ),
  );
  if (!two) return null;
  return saveStep(
    store,
    two,
    recordDecisionNotice(two, now - 60, mutation(two, "decision-notice")),
  );
}

harness.post("/__seed-review", async (c) => {
  const raw: unknown = await c.req.json().catch(() => null);
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    return c.text("invalid", 422);
  const input = raw as Record<string, unknown>;
  const target = authChallengeRequestSchema.safeParse({
    address: input.target,
  });
  const caseId = reviewCaseIdSchema.safeParse(input.caseId);
  if (
    !target.success ||
    !caseId.success ||
    !["reviewing", "reviewing-ready", "decided"].includes(String(input.state))
  ) {
    return c.text("invalid", 422);
  }
  const now = Math.floor(Date.now() / 1000);
  const state =
    input.state === "decided"
      ? "decided"
      : input.state === "reviewing-ready"
        ? "reviewing-ready"
        : "reviewing";
  const extraReviewers = Array.isArray(input.primaryReviewers)
    ? input.primaryReviewers.map((value) =>
        authChallengeRequestSchema.safeParse({ address: value }),
      )
    : [];
  const extraAppealReviewers = Array.isArray(input.appealReviewers)
    ? input.appealReviewers.map((value) =>
        authChallengeRequestSchema.safeParse({ address: value }),
      )
    : [];
  if (
    extraReviewers.some((value) => !value.success) ||
    extraAppealReviewers.some((value) => !value.success)
  )
    return c.text("invalid reviewers", 422);
  const received = receiveReviewCase({
    caseId: caseId.data,
    operationId: crypto.randomUUID(),
    reporter,
    contact: {
      id: `contact-${caseId.data}`,
      reporter,
      target: target.data.address,
      stableSubjectId: `subject-${target.data.address.toLowerCase()}`,
      expiresAt: now + 3_600,
    },
    fixture: {
      id: "synthetic",
      prohibitedAct: "synthetic-solicitation",
      summary: "Synthetic notice for local authorization test",
      supportsSuspension: true,
    },
    policy: {
      version: 1,
      prohibitedAct: "synthetic-solicitation",
      fixtureIds: ["synthetic"],
      responseSeconds: 3_600,
      appealSeconds: 3_600,
      maxSuspensionSeconds: 86_400,
      primaryReviewers: [
        first,
        second,
        ...extraReviewers.flatMap((value) =>
          value.success ? [value.data.address] : [],
        ),
      ],
      appealReviewers: [
        appealFirst,
        appealSecond,
        ...extraAppealReviewers.flatMap((value) =>
          value.success ? [value.data.address] : [],
        ),
      ],
      issuerOperators: ["0x8888888888888888888888888888888888888888"],
    },
    issuanceId: `0x${"a".repeat(64)}`,
    now: state === "reviewing" ? now : now - 8_000,
    existingCases: [],
  });
  if (!received.ok) return c.text("invalid fixture", 500);
  const store = c.env.AUTH_STORE.getByName("review-ledger");
  if (!(await store.putReviewCase(received.data, 0)))
    return c.text("duplicate", 409);
  const review = await advanceReview(store, received.data, state, now);
  if (!review) return c.text("transition failed", 500);
  return c.json({ state: review.state, revision: review.revision });
});

harness.post("/__reverse-review", async (c) => {
  const caseId = reviewCaseIdSchema.safeParse(c.req.query("id"));
  if (!caseId.success) return c.text("invalid", 422);
  const store = c.env.AUTH_STORE.getByName("review-ledger");
  const review = await store.getReviewCase(caseId.data);
  if (!review) return c.text("missing", 404);
  const now = Math.floor(Date.now() / 1_000);
  const appealed = await saveStep(
    store,
    review,
    appealReview(
      review,
      review.target,
      "synthetic",
      now,
      mutation(review, "appeal"),
    ),
  );
  if (!appealed) return c.text("appeal failed", 409);
  const one = await saveStep(
    store,
    appealed,
    castAppealVote(
      appealed,
      appealFirst,
      "reverse",
      now,
      mutation(appealed, "reverse-one"),
    ),
  );
  if (!one) return c.text("first vote failed", 409);
  const two = await saveStep(
    store,
    one,
    castAppealVote(
      one,
      appealSecond,
      "reverse",
      now,
      mutation(one, "reverse-two"),
    ),
  );
  if (!two) return c.text("second vote failed", 409);
  return c.json({ state: two.state, isReversed: two.isReversed });
});

harness.get("/__effective-review", async (c) => {
  const target = authChallengeRequestSchema.safeParse({
    address: c.req.query("target"),
  });
  const at = Number(c.req.query("at"));
  if (!target.success || !Number.isSafeInteger(at) || at <= 0)
    return c.text("invalid", 422);
  const store = c.env.AUTH_STORE.getByName("review-ledger");
  const stableSubjectId = `subject-${target.data.address.toLowerCase()}`;
  const reviews = await store.getReviewsForSubject(stableSubjectId);
  const retained = await store.getRetainedMeasuresForSubject(stableSubjectId);
  return c.json({
    suspendedUntil: getEffectiveSuspension(
      stableSubjectId,
      reviews,
      retained,
      at,
    ),
  });
});

harness.route("/", app);

export { AuthStore };
export default harness;
