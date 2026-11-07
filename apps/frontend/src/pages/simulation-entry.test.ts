/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createSimulationConsentApi,
  getSimulationGate,
  type SimulationEntry,
} from "./simulation-entry.ts";

const consent = {
  version: 2,
  participate: true,
  allowPersonaUse: true,
  updatedAt: "2026-11-07T09:00:00.000Z",
};
const entry: SimulationEntry = {
  kind: "authorized",
  matchId: "synthetic-match",
  expiresAt: 1_800_000_000,
  consent,
  matchKind: "synthetic",
  modelKind: "scripted",
};

describe("simulation entry gate", () => {
  it("should require both separate permissions before opening AIBot", () => {
    assert.equal(getSimulationGate(entry, consent, 1_799_999_999), "ready");
    assert.equal(
      getSimulationGate(
        entry,
        { ...consent, participate: false },
        1_799_999_999,
      ),
      "consent-required",
    );
    assert.equal(
      getSimulationGate(
        entry,
        { ...consent, allowPersonaUse: false },
        1_799_999_999,
      ),
      "consent-required",
    );
  });

  it("should fail closed before clock check and at expiry", () => {
    assert.equal(getSimulationGate(entry, consent, null), "checking");
    assert.equal(getSimulationGate(entry, consent, entry.expiresAt), "expired");
    assert.equal(
      getSimulationGate({ kind: "unavailable" }, null, 1),
      "unavailable",
    );
    assert.equal(
      getSimulationGate({ ...entry, expiresAt: Number.NaN }, consent, 1),
      "unavailable",
    );
    assert.equal(
      getSimulationGate({ ...entry, expiresAt: 8_640_000_000_001 }, consent, 1),
      "unavailable",
    );
  });
});

describe("simulation consent browser client", () => {
  it("should submit only a versioned consent to the same-origin private API", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const api = createSimulationConsentApi(async (url, init) => {
      calls.push({ url: String(url), init });
      return Response.json({ ...consent, version: 3 });
    });
    const updated = await api("synthetic-match", {
      expectedVersion: 2,
      participate: true,
      allowPersonaUse: false,
    });
    assert.equal(updated.version, 3);
    assert.equal(
      calls[0].url,
      "/v1/matches/synthetic-match/simulation-consents/me",
    );
    assert.equal(calls[0].init?.credentials, "same-origin");
    assert.equal(calls[0].init?.cache, "no-store");
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
      expectedVersion: 2,
      participate: true,
      allowPersonaUse: false,
    });
    const headers = calls[0].init?.headers as Record<string, string>;
    assert.match(headers["X-Operation-Id"], /^[0-9a-f-]{36}$/);
  });

  it("should reject malformed input, API errors, and malformed responses", async () => {
    let calls = 0;
    const api = createSimulationConsentApi(async () => {
      calls += 1;
      return Response.json(consent);
    });
    await assert.rejects(
      api("", { expectedVersion: 2, participate: true, allowPersonaUse: true }),
    );
    assert.equal(calls, 0);
    await assert.rejects(
      createSimulationConsentApi(
        async () => new Response(null, { status: 409 }),
      )(entry.matchId, {
        expectedVersion: 2,
        participate: true,
        allowPersonaUse: true,
      }),
      /409/,
    );
    await assert.rejects(
      createSimulationConsentApi(async () =>
        Response.json({ ...consent, version: "3" }),
      )(entry.matchId, {
        expectedVersion: 2,
        participate: true,
        allowPersonaUse: true,
      }),
    );
  });
});
