import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Hono } from "hono";
import type { SimulationMatchEvidence } from "./access.ts";
import {
  createSimulationRoutes,
  fetchAibotPersonaMetadata,
  type PendingDateRequest,
  type SimulationRoutesDependencies,
} from "./routes.ts";

const alicePersona = "602be700-5512-4c39-b7b3-ac57e41d0f3c";
const bobPersona = "e49e3ac7-438f-4b43-8a9b-e611f6837b42";
const token = "service-only-test-token";
const alice = {
  subject: "alice",
  personaId: alicePersona,
  personaVersion: 1,
  participate: true,
  allowPersonaUse: true,
  blockedSubjects: [],
};
const bob = {
  subject: "bob",
  personaId: bobPersona,
  personaVersion: 2,
  participate: true,
  allowPersonaUse: true,
  blockedSubjects: [],
};

type Fixture = {
  request: (
    path: string,
    init?: RequestInit,
    subject?: string,
    serviceToken?: string,
  ) => Promise<Response>;
  setMatch: (evidence: SimulationMatchEvidence) => void;
  setMetadata: (metadata: unknown) => void;
  failMetadata: () => void;
  metadataCalls: () => number;
};

function makeMatch(matchId = "match-1"): SimulationMatchEvidence {
  return {
    matchId,
    status: "confirmed",
    expiresAt: 1_800_000_000,
    participants: [{ ...alice }, { ...bob }],
  };
}

function createFixture(): Fixture {
  const evidence = new Map<string, SimulationMatchEvidence>([
    ["match-1", makeMatch()],
    ["match-2", makeMatch("match-2")],
  ]);
  const requests = new Map<
    string,
    {
      input: PendingDateRequest;
      response: { requestId: string; status: "pending" };
    }
  >();
  let metadata: unknown = {
    personaId: bobPersona,
    ownerSubject: "bob",
    status: "approved",
    version: 2,
  };
  let metadataCalls = 0;
  let isMetadataDown = false;
  const deps: SimulationRoutesDependencies = {
    loadMatchEvidence: async (id) => evidence.get(id) ?? null,
    createPendingDateRequest: async (input) => {
      const stored = requests.get(input.gameSessionId);
      if (stored) {
        if (
          stored.input.matchId !== input.matchId ||
          stored.input.playerSubject !== input.playerSubject
        )
          return { ok: false, error: "CONFLICT" };
        return { ok: true, data: stored.response };
      }
      const response = {
        requestId: crypto.randomUUID(),
        status: "pending" as const,
      };
      requests.set(input.gameSessionId, { input, response });
      return { ok: true, data: response };
    },
    fetchPersonaMetadata: async () => {
      metadataCalls += 1;
      if (isMetadataDown) throw new Error("synthetic outage");
      return metadata;
    },
    nowSeconds: () => 1_700_000_000,
  };
  const app = new Hono<{ Bindings: CloudflareBindings }>();
  app.route("/v1", createSimulationRoutes(deps));
  return {
    request: async (path, init = {}, subject = "alice", serviceToken = token) =>
      app.request(
        `http://localhost/v1${path}`,
        {
          ...init,
          headers: {
            Authorization: `Bearer ${serviceToken}`,
            "X-Player-Subject": subject,
            ...init.headers,
          },
        },
        { MATCHING_API_TOKEN: token } as unknown as CloudflareBindings,
      ),
    setMatch: (match) => evidence.set(match.matchId, match),
    setMetadata: (value) => {
      metadata = value;
    },
    failMetadata: () => {
      isMetadataDown = true;
    },
    metadataCalls: () => metadataCalls,
  };
}

function dateRequest(matchId: string, gameSessionId: string): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": gameSessionId,
    },
    body: JSON.stringify({ matchId, gameSessionId }),
  };
}

describe("AIBot service routes with synthetic match evidence", () => {
  it("should require service Bearer auth and hide another subject's match", async () => {
    const fixture = createFixture();
    const missing = await fixture.request("/matches/match-1", {
      headers: { Authorization: "" },
    });
    assert.equal(missing.status, 401);
    const wrong = await fixture.request(
      "/matches/match-1",
      {},
      "alice",
      "wrong-token",
    );
    assert.equal(wrong.status, 401);
    const outsider = await fixture.request("/matches/match-1", {}, "outsider");
    assert.equal(outsider.status, 404);
    const allowed = await fixture.request("/matches/match-1");
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await allowed.json(), {
      matchId: "match-1",
      agentPersonaId: bobPersona,
      playerSubject: "alice",
      simulationConsent: true,
      expiresAt: 1_800_000_000,
    });
  });

  it("should fail closed for block, revoked consent, expiry, and Persona outage", async () => {
    const fixture = createFixture();
    fixture.setMatch({
      ...makeMatch(),
      participants: [{ ...alice, blockedSubjects: ["bob"] }, { ...bob }],
    });
    assert.equal((await fixture.request("/matches/match-1")).status, 404);
    assert.equal(fixture.metadataCalls(), 0);
    fixture.setMatch({
      ...makeMatch(),
      participants: [{ ...alice }, { ...bob, participate: false }],
    });
    assert.equal((await fixture.request("/matches/match-1")).status, 404);
    fixture.setMatch({ ...makeMatch(), expiresAt: 1_700_000_000 });
    assert.equal((await fixture.request("/matches/match-1")).status, 404);
    fixture.setMatch(makeMatch());
    fixture.setMetadata({
      personaId: bobPersona,
      ownerSubject: "bob",
      status: "revoked",
      version: 2,
    });
    assert.equal((await fixture.request("/matches/match-1")).status, 404);
    fixture.failMetadata();
    assert.equal((await fixture.request("/matches/match-1")).status, 503);
  });

  it("should create pending requests idempotently and reject different content", async () => {
    const fixture = createFixture();
    const input = dateRequest("match-1", "game-1");
    const responses = await Promise.all([
      fixture.request("/date-requests", input),
      fixture.request("/date-requests", input),
    ]);
    assert.deepEqual(
      responses.map((response) => response.status),
      [202, 202],
    );
    const first = await responses[0].json();
    assert.deepEqual(await responses[1].json(), first);
    assert.equal((first as { status: string }).status, "pending");
    const conflict = await fixture.request(
      "/date-requests",
      dateRequest("match-2", "game-1"),
    );
    assert.equal(conflict.status, 409);
    const mismatchedKey = await fixture.request("/date-requests", {
      ...input,
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "other-key",
      },
    });
    assert.equal(mismatchedKey.status, 409);
  });

  it("should recheck current consent before replaying a date request", async () => {
    const fixture = createFixture();
    const input = dateRequest("match-1", "game-1");
    assert.equal((await fixture.request("/date-requests", input)).status, 202);
    fixture.setMatch({
      ...makeMatch(),
      participants: [{ ...alice }, { ...bob, allowPersonaUse: false }],
    });
    assert.equal((await fixture.request("/date-requests", input)).status, 404);
  });
});

it("should fetch only AIBot Persona metadata with a private parent token", async () => {
  let observedUrl = "";
  let observedAuthorization = "";
  const metadata = {
    personaId: bobPersona,
    ownerSubject: "bob",
    status: "approved",
    version: 2,
  };
  const result = await fetchAibotPersonaMetadata(
    {
      AIBOT_ORIGIN: "https://aibot.example",
      AIBOT_PARENT_SERVICE_TOKEN: "parent-secret",
    },
    bobPersona,
    async (input, init) => {
      observedUrl = String(input);
      observedAuthorization =
        new Headers(init?.headers).get("Authorization") ?? "";
      assert.equal(init?.cache, "no-store");
      assert.equal(init?.redirect, "error");
      return Response.json(metadata);
    },
  );
  assert.deepEqual(result, metadata);
  assert.equal(
    observedUrl,
    `https://aibot.example/api/personas/${bobPersona}/metadata`,
  );
  assert.equal(observedAuthorization, "Bearer parent-secret");
  await assert.rejects(() =>
    fetchAibotPersonaMetadata(
      {
        AIBOT_ORIGIN: "http://aibot.example",
        AIBOT_PARENT_SERVICE_TOKEN: "parent-secret",
      },
      bobPersona,
    ),
  );
});
