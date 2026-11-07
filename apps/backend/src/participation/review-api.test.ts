import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { describe, it } from "node:test";
import { fileURLToPath, URL } from "node:url";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const backendDirectory = fileURLToPath(new URL("../../", import.meta.url));
const wranglerPath = fileURLToPath(
  new URL("../../node_modules/wrangler/bin/wrangler.js", import.meta.url),
);

async function waitForWorker(
  origin: string,
  exited: () => boolean,
): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (exited()) throw new Error("Local Wrangler exited before readiness");
    try {
      if ((await fetch(origin)).status === 404) return;
    } catch {
      // Local socket is not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Local Wrangler did not become ready");
}

async function signIn(
  origin: string,
  account: ReturnType<typeof privateKeyToAccount>,
): Promise<string> {
  const challengeResponse = await fetch(`${origin}/v1/auth/challenges`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ address: account.address }),
  });
  assert.equal(challengeResponse.status, 200);
  const challenge = (await challengeResponse.json()) as { message: string };
  const signature = await account.signMessage({ message: challenge.message });
  const session = await fetch(`${origin}/v1/auth/sessions`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ message: challenge.message, signature }),
  });
  assert.equal(session.status, 204);
  return session.headers.get("set-cookie")?.split(";")[0] ?? "";
}

describe("private review API", () => {
  it("should keep notices, responses and appeals accessible to a suspended owner only", async () => {
    const port = 30000 + Math.floor(Math.random() * 20000);
    const origin = `http://127.0.0.1:${port}`;
    const child = spawn(
      process.execPath,
      [
        wranglerPath,
        "dev",
        "src/participation/review-harness.ts",
        "--local",
        "--port",
        String(port),
      ],
      {
        cwd: backendDirectory,
        env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let hasExited = false;
    child.once("exit", () => {
      hasExited = true;
    });
    try {
      await waitForWorker(origin, () => hasExited);
      const owner = privateKeyToAccount(generatePrivateKey());
      const outsider = privateKeyToAccount(generatePrivateKey());
      const reviewingId = `reviewing-${crypto.randomUUID()}`;
      const decidedId = `decided-${crypto.randomUUID()}`;
      const otherId = `other-${crypto.randomUUID()}`;
      const ownerCookie = await signIn(origin, owner);
      const outsiderCookie = await signIn(origin, outsider);
      for (const state of ["reviewing", "decided"]) {
        const seeded = await fetch(`${origin}/__seed-review`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId: state === "reviewing" ? reviewingId : decidedId,
            target: owner.address,
            state,
          }),
        });
        assert.equal(seeded.status, 200, await seeded.text());
      }
      const otherSeed = await fetch(`${origin}/__seed-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: otherId,
          target: owner.address,
          state: "decided",
        }),
      });
      assert.equal(otherSeed.status, 200, await otherSeed.text());
      const ownerNotice = await fetch(
        `${origin}/v1/review-cases/${decidedId}`,
        { headers: { Cookie: ownerCookie } },
      );
      assert.equal(ownerNotice.status, 200);
      const notice = (await ownerNotice.json()) as {
        state: string;
        revision: number;
        suspendedUntil: string;
      };
      assert.equal(notice.state, "decided");
      assert.ok(new Date(notice.suspendedUntil).getTime() > Date.now());
      assert.equal(ownerNotice.headers.get("Cache-Control"), "no-store");
      const outsiderNotice = await fetch(
        `${origin}/v1/review-cases/${decidedId}`,
        { headers: { Cookie: outsiderCookie } },
      );
      assert.equal(outsiderNotice.status, 404);
      assert.equal(outsiderNotice.headers.get("Cache-Control"), "no-store");
      const outsiderBody = await outsiderNotice.text();
      assert.equal(outsiderBody.includes(decidedId), false);
      assert.equal(outsiderBody.includes("Synthetic notice"), false);
      const anonymousNotice = await fetch(
        `${origin}/v1/review-cases/${decidedId}`,
      );
      assert.equal(anonymousNotice.status, 401);
      assert.equal((await anonymousNotice.text()).includes(decidedId), false);

      const beforeResponse = await fetch(
        `${origin}/v1/review-cases/${reviewingId}`,
        { headers: { Cookie: ownerCookie } },
      );
      const reviewing = (await beforeResponse.json()) as {
        revision: number;
        responseDeadline: string;
      };

      const responseId = crypto.randomUUID();
      const responseRequest = () =>
        fetch(`${origin}/v1/review-cases/${reviewingId}/responses`, {
          method: "POST",
          headers: {
            Origin: origin,
            Cookie: ownerCookie,
            "Content-Type": "application/json",
            "X-Operation-Id": responseId,
          },
          body: JSON.stringify({
            expectedRevision: reviewing.revision,
            fixtureId: "synthetic",
          }),
        });
      const concurrent = await Promise.all([
        responseRequest(),
        responseRequest(),
      ]);
      assert.deepEqual(
        concurrent.map((response) => response.status),
        [202, 202],
      );
      assert.equal((await responseRequest()).status, 202);
      const afterResponse = await fetch(
        `${origin}/v1/review-cases/${reviewingId}`,
        { headers: { Cookie: ownerCookie } },
      );
      const responseDetail = (await afterResponse.json()) as {
        revision: number;
        responseDeadline: string;
      };
      assert.equal(responseDetail.revision, reviewing.revision + 1);
      assert.equal(responseDetail.responseDeadline, reviewing.responseDeadline);
      const ownerOperation = await fetch(
        `${origin}/v1/operations/${responseId}`,
        { headers: { Cookie: ownerCookie } },
      );
      assert.equal(ownerOperation.status, 200);
      const outsiderOperation = await fetch(
        `${origin}/v1/operations/${responseId}`,
        { headers: { Cookie: outsiderCookie } },
      );
      assert.equal(outsiderOperation.status, 404);

      const reusedAcrossCases = await fetch(
        `${origin}/v1/review-cases/${decidedId}/appeals`,
        {
          method: "POST",
          headers: {
            Origin: origin,
            Cookie: ownerCookie,
            "Content-Type": "application/json",
            "X-Operation-Id": responseId,
          },
          body: JSON.stringify({
            expectedRevision: notice.revision,
            fixtureId: "synthetic",
          }),
        },
      );
      assert.equal(reusedAcrossCases.status, 409);

      const changedReplay = await fetch(
        `${origin}/v1/review-cases/${reviewingId}/responses`,
        {
          method: "POST",
          headers: {
            Origin: origin,
            Cookie: ownerCookie,
            "Content-Type": "application/json",
            "X-Operation-Id": responseId,
          },
          body: JSON.stringify({
            expectedRevision: reviewing.revision,
            fixtureId: "other-fixture",
          }),
        },
      );
      assert.equal(changedReplay.status, 409);
      const staleRevision = await fetch(
        `${origin}/v1/review-cases/${reviewingId}/responses`,
        {
          method: "POST",
          headers: {
            Origin: origin,
            Cookie: ownerCookie,
            "Content-Type": "application/json",
            "X-Operation-Id": crypto.randomUUID(),
          },
          body: JSON.stringify({
            expectedRevision: reviewing.revision,
            fixtureId: "synthetic",
          }),
        },
      );
      assert.equal(staleRevision.status, 409);
      const outsiderResponse = await fetch(
        `${origin}/v1/review-cases/${reviewingId}/responses`,
        {
          method: "POST",
          headers: {
            Origin: origin,
            Cookie: outsiderCookie,
            "Content-Type": "application/json",
            "X-Operation-Id": crypto.randomUUID(),
          },
          body: JSON.stringify({
            expectedRevision: responseDetail.revision,
            fixtureId: "synthetic",
          }),
        },
      );
      assert.equal(outsiderResponse.status, 404);
      assert.equal(outsiderResponse.headers.get("Cache-Control"), "no-store");
      const outsiderResponseBody = await outsiderResponse.text();
      assert.equal(outsiderResponseBody.includes(reviewingId), false);
      assert.equal(outsiderResponseBody.includes("Synthetic notice"), false);
      const wrongOrigin = await fetch(
        `${origin}/v1/review-cases/${reviewingId}/responses`,
        {
          method: "POST",
          headers: {
            Origin: "https://other.example",
            Cookie: ownerCookie,
            "Content-Type": "application/json",
            "X-Operation-Id": crypto.randomUUID(),
          },
          body: JSON.stringify({
            expectedRevision: responseDetail.revision,
            fixtureId: "synthetic",
          }),
        },
      );
      assert.equal(wrongOrigin.status, 422);

      const appealId = crypto.randomUUID();
      const appealed = await fetch(
        `${origin}/v1/review-cases/${decidedId}/appeals`,
        {
          method: "POST",
          headers: {
            Origin: origin,
            Cookie: ownerCookie,
            "Content-Type": "application/json",
            "X-Operation-Id": appealId,
          },
          body: JSON.stringify({
            expectedRevision: notice.revision,
            fixtureId: "synthetic",
          }),
        },
      );
      assert.equal(appealed.status, 202);
      const afterAppeal = await fetch(
        `${origin}/v1/review-cases/${decidedId}`,
        { headers: { Cookie: ownerCookie } },
      );
      const appealDetail = (await afterAppeal.json()) as {
        state: string;
        suspendedUntil: string;
      };
      assert.equal(appealDetail.state, "appealed");
      assert.equal(appealDetail.suspendedUntil, notice.suspendedUntil);

      const reversed = await fetch(`${origin}/__reverse-review?id=${otherId}`, {
        method: "POST",
      });
      assert.equal(reversed.status, 200);
      assert.equal(
        ((await reversed.json()) as { isReversed: boolean }).isReversed,
        true,
      );
      const until = Date.parse(notice.suspendedUntil) / 1_000;
      const effective = async (at: number) => {
        const response = await fetch(
          `${origin}/__effective-review?target=${owner.address}&at=${at}`,
        );
        assert.equal(response.status, 200);
        return (await response.json()) as { suspendedUntil: number | null };
      };
      assert.equal((await effective(until - 1)).suspendedUntil, until);
      assert.equal((await effective(until)).suspendedUntil, null);

      const reviewerA = privateKeyToAccount(generatePrivateKey());
      const reviewerB = privateKeyToAccount(generatePrivateKey());
      const reviewerACookie = await signIn(origin, reviewerA);
      const reviewerBCookie = await signIn(origin, reviewerB);
      const voteCaseId = `vote-${crypto.randomUUID()}`;
      const voteSeed = await fetch(`${origin}/__seed-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: voteCaseId,
          target: owner.address,
          state: "reviewing-ready",
          primaryReviewers: [reviewerA.address, reviewerB.address],
        }),
      });
      assert.equal(voteSeed.status, 200, await voteSeed.text());
      const votePath = `${origin}/v1/review-cases/${voteCaseId}/decisions`;
      const voteDetail = await fetch(
        `${origin}/v1/review-cases/${voteCaseId}`,
        {
          headers: { Cookie: ownerCookie },
        },
      );
      const initialVote = (await voteDetail.json()) as { revision: number };
      const voteUntil = new Date(Date.now() + 7_200_000).toISOString();
      const voteBody = (revision: number) =>
        JSON.stringify({
          expectedRevision: revision,
          policyVersion: 1,
          decision: "suspend",
          fixtureId: "synthetic",
          suspendedUntil: voteUntil,
        });
      const castVote = (cookie: string, revision: number, id: string) =>
        fetch(votePath, {
          method: "POST",
          headers: {
            Origin: origin,
            Cookie: cookie,
            "Content-Type": "application/json",
            "X-Operation-Id": id,
          },
          body: voteBody(revision),
        });
      assert.equal(
        (await castVote(ownerCookie, initialVote.revision, crypto.randomUUID()))
          .status,
        404,
      );
      const firstVoteId = crypto.randomUUID();
      assert.equal(
        (await castVote(reviewerACookie, initialVote.revision, firstVoteId))
          .status,
        202,
      );
      assert.equal(
        (await castVote(reviewerACookie, initialVote.revision, firstVoteId))
          .status,
        202,
      );
      assert.equal(
        (
          await castVote(
            reviewerACookie,
            initialVote.revision,
            crypto.randomUUID(),
          )
        ).status,
        409,
      );
      const afterFirst = await fetch(
        `${origin}/v1/review-cases/${voteCaseId}`,
        {
          headers: { Cookie: ownerCookie },
        },
      );
      const firstDetail = (await afterFirst.json()) as {
        revision: number;
        state: string;
      };
      assert.equal(firstDetail.state, "reviewing");
      assert.equal(firstDetail.revision, initialVote.revision + 1);
      assert.equal(
        (
          await castVote(
            reviewerBCookie,
            firstDetail.revision,
            crypto.randomUUID(),
          )
        ).status,
        202,
      );
      const afterSecond = await fetch(
        `${origin}/v1/review-cases/${voteCaseId}`,
        {
          headers: { Cookie: ownerCookie },
        },
      );
      assert.equal(
        ((await afterSecond.json()) as { state: string }).state,
        "decided",
      );

      const appealReviewerA = privateKeyToAccount(generatePrivateKey());
      const appealReviewerB = privateKeyToAccount(generatePrivateKey());
      const appealACookie = await signIn(origin, appealReviewerA);
      const appealBCookie = await signIn(origin, appealReviewerB);
      const appealCaseId = `appeal-${crypto.randomUUID()}`;
      const appealSeed = await fetch(`${origin}/__seed-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: appealCaseId,
          target: owner.address,
          state: "decided",
          appealReviewers: [appealReviewerA.address, appealReviewerB.address],
        }),
      });
      assert.equal(appealSeed.status, 200, await appealSeed.text());
      const appealNoticeResponse = await fetch(
        `${origin}/v1/review-cases/${appealCaseId}`,
        { headers: { Cookie: ownerCookie } },
      );
      const appealNotice = (await appealNoticeResponse.json()) as {
        revision: number;
      };
      const appealSubmit = await fetch(
        `${origin}/v1/review-cases/${appealCaseId}/appeals`,
        {
          method: "POST",
          headers: {
            Origin: origin,
            Cookie: ownerCookie,
            "Content-Type": "application/json",
            "X-Operation-Id": crypto.randomUUID(),
          },
          body: JSON.stringify({
            expectedRevision: appealNotice.revision,
            fixtureId: "synthetic",
          }),
        },
      );
      assert.equal(appealSubmit.status, 202);
      const appealPath = `${origin}/v1/review-cases/${appealCaseId}/decisions`;
      const castAppeal = (cookie: string, revision: number) =>
        fetch(appealPath, {
          method: "POST",
          headers: {
            Origin: origin,
            Cookie: cookie,
            "Content-Type": "application/json",
            "X-Operation-Id": crypto.randomUUID(),
          },
          body: JSON.stringify({
            expectedRevision: revision,
            policyVersion: 1,
            decision: "reverse",
            fixtureId: "synthetic",
          }),
        });
      const appealedDetailResponse = await fetch(
        `${origin}/v1/review-cases/${appealCaseId}`,
        { headers: { Cookie: ownerCookie } },
      );
      const appealedDetail = (await appealedDetailResponse.json()) as {
        revision: number;
      };
      assert.equal(
        (await castAppeal(reviewerACookie, appealedDetail.revision)).status,
        404,
      );
      assert.equal(
        (await castAppeal(appealACookie, appealedDetail.revision)).status,
        202,
      );
      const afterAppealVoteResponse = await fetch(
        `${origin}/v1/review-cases/${appealCaseId}`,
        { headers: { Cookie: ownerCookie } },
      );
      const afterAppealVote = (await afterAppealVoteResponse.json()) as {
        revision: number;
      };
      assert.equal(
        (await castAppeal(appealBCookie, afterAppealVote.revision)).status,
        202,
      );
      const appealClosed = await fetch(
        `${origin}/v1/review-cases/${appealCaseId}`,
        {
          headers: { Cookie: ownerCookie },
        },
      );
      assert.equal(
        ((await appealClosed.json()) as { state: string }).state,
        "closed",
      );
    } finally {
      if (!hasExited) {
        child.kill("SIGTERM");
        await once(child, "exit");
      }
    }
  });
});
