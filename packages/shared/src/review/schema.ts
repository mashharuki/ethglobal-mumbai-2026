import { z } from "zod";

export const reviewCaseIdSchema = z.string().min(1).max(128);

export const reviewResponseRequestSchema = z.strictObject({
  expectedRevision: z.number().int().min(1),
  fixtureId: z.string().min(1).max(128),
});

export type ReviewResponseRequest = z.infer<typeof reviewResponseRequestSchema>;
