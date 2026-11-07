import { z } from "zod";

export const reviewCaseIdSchema = z.string().min(1).max(128);

const reviewDateSchema = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value));

export const privateReviewCaseSchema = z.strictObject({
  caseId: reviewCaseIdSchema,
  policyVersion: z.number().int().min(1),
  prohibitedAct: z.string().min(1),
  state: z.enum(["received", "reviewing", "decided", "appealed", "closed"]),
  revision: z.number().int().min(1),
  openedAt: reviewDateSchema,
  syntheticSummary: z.string().max(1024).optional(),
  responseDeadline: reviewDateSchema.optional(),
  appealDeadline: reviewDateSchema.optional(),
  suspendedUntil: reviewDateSchema.optional(),
});

export type PrivateReviewCase = z.infer<typeof privateReviewCaseSchema>;

export const reviewResponseRequestSchema = z.strictObject({
  expectedRevision: z.number().int().min(1),
  fixtureId: z.string().min(1).max(128),
});

export const reviewDecisionRequestSchema = z
  .strictObject({
    expectedRevision: z.number().int().min(1),
    policyVersion: z.number().int().min(1),
    decision: z.enum(["dismiss", "suspend", "reverse", "uphold"]),
    fixtureId: z.string().min(1).max(128),
    suspendedUntil: z.iso.datetime({ offset: true }).optional(),
  })
  .refine(
    (value) => (value.decision === "suspend") === !!value.suspendedUntil,
    { path: ["suspendedUntil"] },
  );

export type ReviewResponseRequest = z.infer<typeof reviewResponseRequestSchema>;
export type ReviewDecisionRequest = z.infer<typeof reviewDecisionRequestSchema>;
