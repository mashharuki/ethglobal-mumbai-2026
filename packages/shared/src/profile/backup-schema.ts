import { z } from "zod";

const base64UrlSchema = z.string().regex(/^[A-Za-z0-9_-]+$/);

export const privateBackupEnvelopeSchema = z.strictObject({
  format: z.literal("secret-tinder-private-backup"),
  version: z.literal(1),
  cipher: z.literal("AES-256-GCM"),
  kdf: z.literal("PBKDF2-SHA-256"),
  iterations: z.literal(600_000),
  salt: base64UrlSchema.length(22),
  iv: base64UrlSchema.length(16),
  ciphertext: base64UrlSchema.min(22).max(200_000),
});

export type PrivateBackupEnvelope = z.infer<typeof privateBackupEnvelopeSchema>;
