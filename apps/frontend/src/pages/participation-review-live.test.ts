/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createPrivateReviewApi,
  signInForReview,
} from "./participation-review-live.ts";

const wallet = "0xfb6DF0D12052a1c8E58920654D44015C61552E57";
const fixture = {
  caseId: "synthetic-case",
  policyVersion: 1,
  prohibitedAct: "synthetic-solicitation",
  state: "reviewing",
  revision: 4,
  openedAt: "2026-11-07T00:00:00.000Z",
  syntheticSummary: "Synthetic notice",
  responseDeadline: "2026-11-07T02:00:00.000Z",
};

describe("private review browser client", () => {
  it("should sign in and use only same-origin uncached private requests", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetcher: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith("/auth/challenges")) {
        return Response.json({
          message: "Synthetic SIWE challenge",
          expiresAt: "2026-11-07T03:00:00.000Z",
        });
      }
      if (String(url).endsWith("/auth/sessions")) {
        return new Response(null, { status: 204 });
      }
      if (String(url).endsWith("/responses")) {
        return Response.json(
          { operationId: crypto.randomUUID(), status: "pending" },
          { status: 202 },
        );
      }
      return Response.json(fixture);
    };
    const provider = {
      async request(input: { method: string }): Promise<unknown> {
        if (input.method === "eth_chainId") return "0xaa36a7";
        if (input.method === "eth_requestAccounts") return [wallet];
        return `0x${"1".repeat(130)}`;
      },
    };
    const api = createPrivateReviewApi(fetcher);
    assert.equal(await signInForReview(api, provider), wallet);
    const review = await api.getCase(fixture.caseId);
    assert.equal(review.prohibitedAct, fixture.prohibitedAct);
    assert.equal(
      review.responseDeadline?.toISOString(),
      fixture.responseDeadline,
    );
    await api.submitCase("response", review, "synthetic");
    assert.deepEqual(
      calls.map((call) => call.url),
      [
        "/v1/auth/challenges",
        "/v1/auth/sessions",
        "/v1/review-cases/synthetic-case",
        "/v1/review-cases/synthetic-case/responses",
      ],
    );
    for (const call of calls) {
      assert.equal(call.init?.credentials, "same-origin");
      assert.equal(call.init?.cache, "no-store");
    }
    const responseBody = JSON.parse(String(calls[3].init?.body)) as {
      expectedRevision: number;
      fixtureId: string;
    };
    assert.equal(responseBody.expectedRevision, 4);
    assert.equal(responseBody.fixtureId, "synthetic");
    const headers = (calls[3].init?.headers ?? {}) as Record<string, string>;
    assert.match(String(headers["X-Operation-Id"]), /^[0-9a-f-]{36}$/);
  });

  it("should reject another case and malformed private responses", async () => {
    const forbidden = createPrivateReviewApi(async () =>
      Response.json({ code: "NOT_FOUND" }, { status: 404 }),
    );
    await assert.rejects(forbidden.getCase("other-case"), /404/);
    const malformed = createPrivateReviewApi(async () =>
      Response.json({ ...fixture, prohibitedAct: null }),
    );
    await assert.rejects(malformed.getCase(fixture.caseId));
  });

  it("should require Sepolia before asking the wallet to sign", async () => {
    let requests = 0;
    const api = createPrivateReviewApi(async () => {
      requests += 1;
      return Response.json({});
    });
    await assert.rejects(
      signInForReview(api, { request: async () => "0x1" }),
      /Sepolia/,
    );
    assert.equal(requests, 0);
  });
});
