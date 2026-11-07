import { z } from "zod";

export const reviewCaseIdSchema = z.string().min(1).max(128);

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
