import { isAddress, isHex } from "viem";
import { z } from "zod";

export const authChallengeRequestSchema = z.strictObject({
  address: z.string().refine(isAddress, "Invalid EVM address"),
});

export const authSessionRequestSchema = z.strictObject({
  message: z.string().min(1).max(4096),
  signature: z
    .string()
    .max(2048)
    .refine((value) => isHex(value, { strict: true }), "Invalid hex signature"),
});

export const operationIdSchema = z.uuid();

export type AuthChallengeRequest = z.infer<typeof authChallengeRequestSchema>;
export type AuthSessionRequest = z.infer<typeof authSessionRequestSchema>;
