import { isAddress, isHex } from "viem";
import { z } from "zod";

export const authChallengeRequestSchema = z.strictObject({
  address: z
    .string()
    .refine(
      (value) => isAddress(value, { strict: false }),
      "Invalid EVM address",
    ),
});

export const authChallengeResponseSchema = z.strictObject({
  message: z.string().min(1).max(4096),
  expiresAt: z.iso.datetime({ offset: true }),
});

export const authSessionRequestSchema = z.strictObject({
  message: z.string().min(1).max(4096),
  signature: z
    .string()
    .max(2048)
    .regex(/^0x(?:[0-9a-fA-F]{2})+$/, "Invalid hex signature")
    .refine(isHex),
});

export const operationIdSchema = z.uuid();

export type AuthChallengeRequest = z.infer<typeof authChallengeRequestSchema>;
export type AuthSessionRequest = z.infer<typeof authSessionRequestSchema>;
