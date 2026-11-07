import { z } from "zod";

const simulationIdSchema = z.string().min(1).max(128);
const playerSubjectSchema = z.string().min(1).max(100);

export const simulationIdentityClaimsSchema = z.strictObject({
  sub: playerSubjectSchema,
  aud: z.literal("love-match-masala"),
  exp: z.number().int().positive(),
});

export const simulationAssertionSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);

export const authorizedSimulationMatchSchema = z.strictObject({
  matchId: simulationIdSchema,
  agentPersonaId: z.string().uuid(),
  playerSubject: playerSubjectSchema,
  simulationConsent: z.literal(true),
  expiresAt: z.number().int().positive(),
});

export type AuthorizedSimulationMatch = z.infer<
  typeof authorizedSimulationMatchSchema
>;

export const simulationConsentRequestSchema = z.strictObject({
  expectedVersion: z.number().int().nonnegative(),
  participate: z.boolean(),
  allowPersonaUse: z.boolean(),
});

export const simulationConsentSchema = z.strictObject({
  version: z.number().int().positive(),
  participate: z.boolean(),
  allowPersonaUse: z.boolean(),
  updatedAt: z.iso.datetime(),
});

export const simulationPersonaMetadataSchema = z.strictObject({
  personaId: z.string().uuid(),
  ownerSubject: playerSubjectSchema,
  status: z.enum(["approved", "revoked"]),
  version: z.number().int().positive(),
});

export type SimulationPersonaMetadata = z.infer<
  typeof simulationPersonaMetadataSchema
>;

export const simulationDateRequestInputSchema = z.strictObject({
  matchId: simulationIdSchema,
  gameSessionId: simulationIdSchema,
});

export const simulationDateRequestSchema = z.strictObject({
  requestId: simulationIdSchema,
  status: z.enum(["pending", "accepted"]),
});

export function isCurrentAuthorizedSimulationMatch(
  match: AuthorizedSimulationMatch,
  expected: {
    matchId: string;
    agentPersonaId: string;
    playerSubject: string;
    nowSeconds: number;
  },
): boolean {
  return (
    match.matchId === expected.matchId &&
    match.agentPersonaId === expected.agentPersonaId &&
    match.playerSubject === expected.playerSubject &&
    match.expiresAt > expected.nowSeconds
  );
}
