// Local Wrangler entry point used only by review-api.test.ts; wrangler.jsonc still deploys src/index.ts.
import { Hono } from "hono";
import { authChallengeRequestSchema, reviewCaseIdSchema } from "shared";
import app, { AuthStore } from "../index.ts";
import { receiveReviewCase } from "./review.ts";

const harness = new Hono<{ Bindings: CloudflareBindings }>();

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
    !["reviewing", "decided"].includes(String(input.state))
  ) {
    return c.text("invalid", 422);
  }
  const now = Math.floor(Date.now() / 1000);
  const received = receiveReviewCase({
    caseId: caseId.data,
    operationId: crypto.randomUUID(),
    reporter: "0x1111111111111111111111111111111111111111",
    contact: {
      id: `contact-${caseId.data}`,
      reporter: "0x1111111111111111111111111111111111111111",
      target: target.data.address,
      stableSubjectId: `subject-${caseId.data}`,
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
        "0x3333333333333333333333333333333333333333",
        "0x4444444444444444444444444444444444444444",
      ],
      appealReviewers: [
        "0x6666666666666666666666666666666666666666",
        "0x7777777777777777777777777777777777777777",
      ],
      issuerOperators: ["0x8888888888888888888888888888888888888888"],
    },
    issuanceId: `0x${"a".repeat(64)}`,
    now,
    existingCases: [],
  });
  if (!received.ok) return c.text("invalid fixture", 500);
  const review =
    input.state === "decided"
      ? {
          ...received.data,
          state: "decided" as const,
          decision: {
            outcome: "suspend" as const,
            suspendedUntil: now + 7_200,
          },
          reviewNoticeAt: now - 7_200,
          responseDeadline: now - 3_600,
          decisionNoticeAt: now - 60,
          appealDeadline: now + 3_540,
        }
      : {
          ...received.data,
          state: "reviewing" as const,
          reviewNoticeAt: now,
          responseDeadline: now + 3_600,
        };
  const store = c.env.AUTH_STORE.getByName("review-ledger");
  const stored = await store.putReviewCase(review, 0);
  const exists = !!(await store.getReviewCase(caseId.data));
  return c.json({ stored, exists }, stored ? 200 : 409);
});

harness.route("/", app);

export { AuthStore };
export default harness;
