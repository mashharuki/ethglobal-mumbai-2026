import { z } from "zod";

const hexBytes = z.string().regex(/^0x(?:[0-9a-fA-F]{2})+$/);

export const searchLeaseRequestSchema = z.strictObject({
  ephemeralPublicKey: hexBytes.max(512),
  credentialGeneration: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  credentialVersion: z.number().int().positive(),
  registrationVersion: z.number().int().positive(),
  ownerSignature: hexBytes.max(2048),
});

export type SearchLeaseRequest = z.infer<typeof searchLeaseRequestSchema>;
