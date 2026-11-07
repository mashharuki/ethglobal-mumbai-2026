import assert from "node:assert/strict";
import { it } from "node:test";

import {
  authorizeSimulationMatch,
  type SimulationMatchEvidence,
} from "./access.ts";

const alice = {
  subject: "alice",
  personaId: "602be700-5512-4c39-b7b3-ac57e41d0f3c",
  personaVersion: 2,
  participate: true,
  allowPersonaUse: true,
  blockedSubjects: [],
} as const;
const bob = {
  subject: "bob",
  personaId: "e49e3ac7-438f-4b43-8a9b-e611f6837b42",
  personaVersion: 3,
  participate: true,
  allowPersonaUse: true,
  blockedSubjects: [],
} as const;
const match = {
  matchId: "match-1",
  status: "confirmed",
  expiresAt: 1_800_000_000,
  participants: [alice, bob],
} satisfies SimulationMatchEvidence;
const bobMetadata = {
  personaId: bob.personaId,
  ownerSubject: bob.subject,
  status: "approved",
  version: bob.personaVersion,
} as const;

it("should authorize only the confirmed counterpart's approved Persona", async () => {
  const result = await authorizeSimulationMatch(
    match,
    "alice",
    async () => bobMetadata,
    match.expiresAt - 1,
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.playerSubject, "alice");
    assert.equal(result.data.agentPersonaId, bob.personaId);
  }
  const outsider = await authorizeSimulationMatch(
    match,
    "outsider",
    async () => bobMetadata,
    match.expiresAt - 1,
  );
  assert.deepEqual(outsider, { ok: false, error: "NOT_FOUND" });
});

it("should deny revoked, replaced, or misowned Persona metadata", async () => {
  for (const metadata of [
    { ...bobMetadata, status: "revoked" },
    { ...bobMetadata, version: 4 },
    { ...bobMetadata, ownerSubject: "outsider" },
    { ...bobMetadata, personaId: alice.personaId },
  ]) {
    const result = await authorizeSimulationMatch(
      match,
      "alice",
      async () => metadata,
      match.expiresAt - 1,
    );
    assert.deepEqual(result, { ok: false, error: "NOT_FOUND" });
  }
});

it("should fail closed for blocks, missing consent, pending matches, and expiry", async () => {
  const cases: SimulationMatchEvidence[] = [
    { ...match, status: "pending" },
    { ...match, participants: [{ ...alice, participate: false }, bob] },
    { ...match, participants: [alice, { ...bob, allowPersonaUse: false }] },
    { ...match, participants: [{ ...alice, blockedSubjects: ["bob"] }, bob] },
    { ...match, participants: [alice, { ...bob, blockedSubjects: ["alice"] }] },
  ];
  for (const candidate of cases) {
    const result = await authorizeSimulationMatch(
      candidate,
      "alice",
      async () => bobMetadata,
      match.expiresAt - 1,
    );
    assert.deepEqual(result, { ok: false, error: "NOT_FOUND" });
  }
  const expired = await authorizeSimulationMatch(
    match,
    "alice",
    async () => bobMetadata,
    match.expiresAt,
  );
  assert.deepEqual(expired, { ok: false, error: "NOT_FOUND" });
});

it("should treat Persona service failure as unavailable", async () => {
  const result = await authorizeSimulationMatch(
    match,
    "alice",
    async () => {
      throw new Error("offline");
    },
    match.expiresAt - 1,
  );
  assert.deepEqual(result, { ok: false, error: "UNAVAILABLE" });
});
