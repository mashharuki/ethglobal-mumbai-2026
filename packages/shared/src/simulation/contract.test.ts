import assert from "node:assert/strict";
import { it } from "node:test";

import {
  authorizedSimulationMatchSchema,
  isCurrentAuthorizedSimulationMatch,
  simulationDateRequestSchema,
  simulationPersonaMetadataSchema,
} from "./contract.ts";

const match = {
  matchId: "match-1",
  agentPersonaId: "f2ea8e35-6ac4-4291-9970-4cb1a9663968",
  playerSubject: "subject-alice",
  simulationConsent: true,
  expiresAt: 1_800_000_000,
} as const;

it("should reject mismatched identity and expired authorization", () => {
  const parsed = authorizedSimulationMatchSchema.parse(match);
  assert.equal(
    isCurrentAuthorizedSimulationMatch(parsed, {
      matchId: match.matchId,
      agentPersonaId: match.agentPersonaId,
      playerSubject: match.playerSubject,
      nowSeconds: match.expiresAt - 1,
    }),
    true,
  );
  assert.equal(
    isCurrentAuthorizedSimulationMatch(parsed, {
      matchId: match.matchId,
      agentPersonaId: match.agentPersonaId,
      playerSubject: "subject-bob",
      nowSeconds: match.expiresAt - 1,
    }),
    false,
  );
  assert.equal(
    isCurrentAuthorizedSimulationMatch(parsed, {
      matchId: match.matchId,
      agentPersonaId: match.agentPersonaId,
      playerSubject: match.playerSubject,
      nowSeconds: match.expiresAt,
    }),
    false,
  );
});

it("should reject unconsented or malformed match responses", () => {
  assert.equal(
    authorizedSimulationMatchSchema.safeParse({
      ...match,
      simulationConsent: false,
    }).success,
    false,
  );
  assert.equal(
    authorizedSimulationMatchSchema.safeParse({
      ...match,
      expiresAt: "2026-11-07T09:00:00Z",
    }).success,
    false,
  );
});

it("should reject Persona content in metadata and unsupported date states", () => {
  assert.equal(
    simulationPersonaMetadataSchema.safeParse({
      personaId: match.agentPersonaId,
      ownerSubject: "subject-bob",
      status: "approved",
      version: 1,
      conversation: "private transcript",
    }).success,
    false,
  );
  assert.equal(
    simulationDateRequestSchema.safeParse({
      requestId: "request-1",
      status: "rejected",
    }).success,
    false,
  );
});
