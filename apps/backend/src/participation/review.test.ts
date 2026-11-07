import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { UnsignedParticipationCredential } from "shared";
import {
  appealReview,
  beginReview,
  castAppealVote,
  castPrimaryVote,
  closeReviewCase,
  compactClosedCases,
  getEffectiveSuspension,
  getPrivateReviewCase,
  type Mutation,
  makePublicCredentialDraft,
  type ReviewCase,
  type ReviewPolicy,
  type ReviewResult,
  receiveReviewCase,
  recordDecisionNotice,
  recordReviewNotice,
  submitRebuttal,
} from "./review.ts";

const reporter = "0x1111111111111111111111111111111111111111";
const target = "0x2222222222222222222222222222222222222222";
const first = "0x3333333333333333333333333333333333333333";
const second = "0x4444444444444444444444444444444444444444";
const third = "0x5555555555555555555555555555555555555555";
const appealFirst = "0x6666666666666666666666666666666666666666";
const appealSecond = "0x7777777777777777777777777777777777777777";
const issuer = "0x8888888888888888888888888888888888888888";
const stranger = "0x9999999999999999999999999999999999999999";
const subjectId = "synthetic-subject-bob";
const issuanceId = `0x${"a".repeat(64)}`;
const start = 1_700_000_000;

function makePolicy(overrides: Partial<ReviewPolicy> = {}): ReviewPolicy {
  return {
    version: 1,
    prohibitedAct: "preannounced-solicitation",
    fixtureIds: ["solicitation", "insufficient", "rebuttal", "correction"],
    responseSeconds: 3_600,
    appealSeconds: 3_600,
    maxSuspensionSeconds: 30 * 86_400,
    primaryReviewers: [first, second, third, reporter, issuer],
    appealReviewers: [appealFirst, appealSecond, first],
    issuerOperators: [issuer],
    ...overrides,
  };
}

function makeCase(id = "contact-1", supportsSuspension = true): ReviewCase {
  const result = receiveReviewCase({
    caseId: `case-${id}`,
    operationId: `receive-${id}`,
    reporter,
    contact: {
      id,
      reporter,
      target,
      stableSubjectId: subjectId,
      expiresAt: start + 100,
    },
    fixture: {
      id: supportsSuspension ? "solicitation" : "insufficient",
      prohibitedAct: "preannounced-solicitation",
      summary: "Synthetic evidence summary",
      supportsSuspension,
    },
    policy: makePolicy(),
    issuanceId,
    now: start,
    existingCases: [],
  });
  assert.equal(result.ok, true);
  return result.data;
}

function mutate(review: ReviewCase, name: string, suffix = ""): Mutation {
  return {
    operationId: `${name}-${review.caseId}-${suffix}`,
    expectedRevision: review.revision,
    fingerprint: `${name}:${suffix}`,
  };
}

function unwrap(result: ReviewResult<ReviewCase>): ReviewCase {
  assert.equal(result.ok, true);
  return result.data;
}

function beginNotifiedReview(review: ReviewCase): ReviewCase {
  const started = unwrap(beginReview(review, first, mutate(review, "begin")));
  return unwrap(
    recordReviewNotice(started, start + 10, mutate(started, "notice")),
  );
}

function decideSuspension(review: ReviewCase, until: number): ReviewCase {
  const choice = {
    outcome: "suspend" as const,
    fixtureId: review.fixtureId,
    suspendedUntil: until,
  };
  const one = unwrap(
    castPrimaryVote(
      review,
      first,
      choice,
      start + 3_610,
      mutate(review, "vote1"),
    ),
  );
  const two = unwrap(
    castPrimaryVote(one, second, choice, start + 3_611, mutate(one, "vote2")),
  );
  return unwrap(
    recordDecisionNotice(two, start + 3_612, mutate(two, "decision-notice")),
  );
}

function makeCredential(): UnsignedParticipationCredential {
  return {
    schemaVersion: 1,
    chainId: 11155111,
    registry: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    issuer,
    subject: target,
    dnsName: "bob.secrettinder.eth",
    issuanceId,
    issuanceEvent: { transactionHash: `0x${"b".repeat(64)}`, logIndex: 0 },
    credentialVersion: 1,
    status: "eligible",
    expiresAt: start + 29 * 86_400,
    policyVersion: 1,
    accessTier: "new",
    suspendedUntil: null,
  };
}

describe("synthetic participation review", () => {
  it("should keep a received report private and leave eligibility unchanged", () => {
    const review = makeCase();
    assert.equal(review.state, "received");
    assert.equal(
      getEffectiveSuspension(subjectId, [review], [], start + 1),
      null,
    );
    assert.deepEqual(getPrivateReviewCase(review, stranger), {
      ok: false,
      error: "NOT_FOUND",
    });
    assert.equal(getPrivateReviewCase(review, target).ok, true);
    const duplicate = receiveReviewCase({
      caseId: "other",
      operationId: "new-operation",
      reporter,
      contact: {
        id: review.contactId,
        reporter,
        target,
        stableSubjectId: subjectId,
        expiresAt: start + 100,
      },
      fixture: {
        id: review.fixtureId,
        prohibitedAct: review.policy.prohibitedAct,
        summary: "Synthetic evidence summary",
        supportsSuspension: true,
      },
      policy: makePolicy(),
      issuanceId,
      now: start,
      existingCases: [review],
    });
    assert.equal(duplicate.ok, true);
    assert.equal(duplicate.data.caseId, review.caseId);
  });

  it("should reject unsupported reports and conflicted reviewers", () => {
    const review = makeCase();
    const wrongReporter = receiveReviewCase({
      caseId: "bad",
      operationId: "bad",
      reporter: stranger,
      contact: {
        id: "contact-bad",
        reporter,
        target,
        stableSubjectId: subjectId,
        expiresAt: start + 100,
      },
      fixture: {
        id: "solicitation",
        prohibitedAct: "preannounced-solicitation",
        summary: "Synthetic evidence summary",
        supportsSuspension: true,
      },
      policy: makePolicy(),
      issuanceId,
      now: start,
      existingCases: [],
    });
    assert.deepEqual(wrongReporter, { ok: false, error: "FORBIDDEN" });
    assert.deepEqual(
      beginReview(review, reporter, mutate(review, "bad-begin")),
      { ok: false, error: "FORBIDDEN" },
    );
    assert.deepEqual(
      beginReview(review, issuer, mutate(review, "issuer-begin")),
      { ok: false, error: "FORBIDDEN" },
    );
    const pending = unwrap(beginReview(review, first, mutate(review, "begin")));
    assert.deepEqual(
      castPrimaryVote(
        pending,
        first,
        {
          outcome: "suspend",
          fixtureId: "solicitation",
          suspendedUntil: start + 10_000,
        },
        start + 10_000,
        mutate(pending, "premature"),
      ),
      { ok: false, error: "CONFLICT" },
    );
    const insufficient = beginNotifiedReview(makeCase("contact-2", false));
    assert.deepEqual(
      castPrimaryVote(
        insufficient,
        first,
        {
          outcome: "suspend",
          fixtureId: "insufficient",
          suspendedUntil: start + 10_000,
        },
        start + 3_610,
        mutate(insufficient, "unsupported"),
      ),
      { ok: false, error: "INVALID_INPUT" },
    );
  });

  it("should require notification, response time and two matching votes", () => {
    const review = beginNotifiedReview(makeCase());
    assert.deepEqual(
      castPrimaryVote(
        review,
        first,
        {
          outcome: "suspend",
          fixtureId: "solicitation",
          suspendedUntil: start + 10_000,
        },
        start + 3_609,
        mutate(review, "early"),
      ),
      { ok: false, error: "TOO_EARLY" },
    );
    const rebutted = unwrap(
      submitRebuttal(
        review,
        target,
        "rebuttal",
        start + 3_600,
        mutate(review, "rebuttal"),
      ),
    );
    const choice = {
      outcome: "suspend" as const,
      fixtureId: "solicitation",
      suspendedUntil: start + 10_000,
    };
    const one = unwrap(
      castPrimaryVote(
        rebutted,
        first,
        choice,
        start + 3_610,
        mutate(rebutted, "vote1"),
      ),
    );
    assert.equal(one.state, "reviewing");
    assert.equal(
      getEffectiveSuspension(subjectId, [one], [], start + 3_611),
      null,
    );
    assert.deepEqual(
      castPrimaryVote(
        one,
        first,
        choice,
        start + 3_611,
        mutate(one, "repeat-voter"),
      ),
      { ok: false, error: "CONFLICT" },
    );
    const two = unwrap(
      castPrimaryVote(one, second, choice, start + 3_611, mutate(one, "vote2")),
    );
    assert.equal(two.state, "decided");
    assert.equal(
      getEffectiveSuspension(subjectId, [two], [], start + 3_612),
      null,
    );
    const notified = unwrap(
      recordDecisionNotice(two, start + 3_612, mutate(two, "decision-notice")),
    );
    assert.equal(
      getEffectiveSuspension(subjectId, [notified], [], start + 3_613),
      start + 10_000,
    );
    assert.deepEqual(
      castPrimaryVote(notified, third, choice, start + 3_613, {
        ...mutate(one, "vote3"),
        expectedRevision: one.revision,
      }),
      { ok: false, error: "CONFLICT" },
    );
  });

  it("should preserve the fixed deadline on replay and appeal", () => {
    const review = decideSuspension(
      beginNotifiedReview(makeCase()),
      start + 20_000,
    );
    const input = mutate(review, "appeal");
    const appealed = unwrap(
      appealReview(review, target, "correction", start + 4_000, input),
    );
    const replay = unwrap(
      appealReview(appealed, target, "correction", start + 9_000, input),
    );
    assert.equal(replay.appealDeadline, review.appealDeadline);
    assert.equal(replay.decision?.suspendedUntil, start + 20_000);
    assert.equal(replay.revision, appealed.revision);
    assert.deepEqual(
      castAppealVote(
        replay,
        first,
        "reverse",
        start + 4_001,
        mutate(replay, "conflicted-appeal"),
      ),
      { ok: false, error: "FORBIDDEN" },
    );
    const one = unwrap(
      castAppealVote(
        replay,
        appealFirst,
        "reverse",
        start + 4_001,
        mutate(replay, "appeal-vote1"),
      ),
    );
    const two = unwrap(
      castAppealVote(
        one,
        appealSecond,
        "reverse",
        start + 4_002,
        mutate(one, "appeal-vote2"),
      ),
    );
    assert.equal(two.state, "closed");
    assert.equal(
      getEffectiveSuspension(subjectId, [two], [], start + 4_003),
      null,
    );
  });

  it("should retain other suspensions and reject old issuance on reissue", () => {
    const firstCase = decideSuspension(
      beginNotifiedReview(makeCase("contact-a")),
      start + 20_000,
    );
    const secondCase = decideSuspension(
      beginNotifiedReview(makeCase("contact-b")),
      start + 30_000,
    );
    const appealed = unwrap(
      appealReview(
        firstCase,
        target,
        "correction",
        start + 4_000,
        mutate(firstCase, "appeal"),
      ),
    );
    const one = unwrap(
      castAppealVote(
        appealed,
        appealFirst,
        "reverse",
        start + 4_001,
        mutate(appealed, "appeal-vote1"),
      ),
    );
    const reversed = unwrap(
      castAppealVote(
        one,
        appealSecond,
        "reverse",
        start + 4_002,
        mutate(one, "appeal-vote2"),
      ),
    );
    assert.equal(
      getEffectiveSuspension(
        subjectId,
        [reversed, secondCase],
        [],
        start + 4_003,
      ),
      start + 30_000,
    );
    assert.equal(
      getEffectiveSuspension(
        subjectId,
        [reversed, secondCase],
        [],
        start + 30_000,
      ),
      null,
    );
    const continuity = {
      stableSubjectId: subjectId,
      wallet: target,
      currentIssuanceId: issuanceId,
      latestCredentialVersion: 1,
    };
    const draft = makePublicCredentialDraft(
      makeCredential(),
      continuity,
      [reversed, secondCase],
      [],
      1,
      start + 4_003,
    );
    assert.equal(draft.ok, true);
    assert.equal(draft.data.status, "suspended");
    assert.equal(draft.data.suspendedUntil, start + 30_000);
    assert.equal(draft.data.accessTier, "new");
    assert.equal(draft.data.credentialVersion, 2);
    assert.equal(JSON.stringify(draft.data).includes("case-"), false);
    const reissued = {
      ...continuity,
      currentIssuanceId: `0x${"c".repeat(64)}`,
    };
    assert.deepEqual(
      makePublicCredentialDraft(
        makeCredential(),
        reissued,
        [reversed, secondCase],
        [],
        1,
        start + 4_003,
      ),
      { ok: false, error: "CONFLICT" },
    );
  });

  it("should erase closed details after seven days while retaining an active measure", () => {
    const until = start + 20 * 86_400;
    const review = decideSuspension(beginNotifiedReview(makeCase()), until);
    const closed = unwrap(
      closeReviewCase(
        review,
        (review.appealDeadline ?? 0) + 1,
        mutate(review, "close"),
      ),
    );
    const compacted = compactClosedCases(
      [closed],
      [],
      (closed.closedAt ?? 0) + 7 * 86_400,
    );
    assert.equal(compacted.cases.length, 0);
    assert.deepEqual(compacted.retained, [
      { stableSubjectId: subjectId, policyVersion: 1, suspendedUntil: until },
    ]);
    assert.equal(
      getEffectiveSuspension(
        subjectId,
        compacted.cases,
        compacted.retained,
        start + 10 * 86_400,
      ),
      until,
    );
  });
});
