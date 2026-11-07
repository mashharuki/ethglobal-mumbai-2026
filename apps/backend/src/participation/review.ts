import type { UnsignedParticipationCredential } from "shared";
import { getAddress, isAddressEqual } from "viem";

const RETENTION_SECONDS = 7 * 86_400;

export type ReviewPolicy = {
  version: number;
  prohibitedAct: string;
  fixtureIds: readonly string[];
  responseSeconds: number;
  appealSeconds: number;
  maxSuspensionSeconds: number;
  primaryReviewers: readonly string[];
  appealReviewers: readonly string[];
  issuerOperators: readonly string[];
};

export type SyntheticFixture = {
  id: string;
  prohibitedAct: string;
  summary: string;
  supportsSuspension: boolean;
};

export type VerifiedContact = {
  id: string;
  reporter: string;
  target: string;
  stableSubjectId: string;
  expiresAt: number;
};

type Vote = {
  reviewer: string;
  outcome: "dismiss" | "suspend" | "reverse" | "uphold";
  fixtureId: string;
  suspendedUntil: number | null;
};

export type ReviewCase = {
  caseId: string;
  contactId: string;
  reporter: string;
  target: string;
  stableSubjectId: string;
  issuanceIdAtOpen: string;
  policy: ReviewPolicy;
  fixtureId: string;
  syntheticSummary: string;
  supportsSuspension: boolean;
  state: "received" | "reviewing" | "decided" | "appealed" | "closed";
  revision: number;
  openedAt: number;
  reviewNoticeAt: number | null;
  responseDeadline: number | null;
  rebuttalFixtureId: string | null;
  primaryVotes: Vote[];
  decision: {
    outcome: "dismiss" | "suspend";
    suspendedUntil: number | null;
  } | null;
  decisionNoticeAt: number | null;
  appealDeadline: number | null;
  appealFixtureId: string | null;
  appealVotes: Vote[];
  isReversed: boolean;
  closedAt: number | null;
  operationFingerprints: Record<string, string>;
};

export type RetainedMeasure = {
  stableSubjectId: string;
  policyVersion: number;
  suspendedUntil: number;
};

export type SubjectContinuity = {
  stableSubjectId: string;
  wallet: string;
  currentIssuanceId: string;
  latestCredentialVersion: number;
};

type ReviewError =
  | "INVALID_INPUT"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_EARLY"
  | "EXPIRED";
export type ReviewResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ReviewError };
export type Mutation = {
  operationId: string;
  expectedRevision: number;
  fingerprint: string;
};

export type PrivateReviewCase = {
  caseId: string;
  policyVersion: number;
  prohibitedAct: string;
  state: ReviewCase["state"];
  revision: number;
  openedAt: number;
  syntheticSummary: string;
  responseDeadline: number | null;
  appealDeadline: number | null;
  suspendedUntil: number | null;
};

function fail(error: ReviewError): { ok: false; error: ReviewError } {
  return { ok: false, error };
}

function sameWallet(left: string, right: string): boolean {
  try {
    return isAddressEqual(getAddress(left), getAddress(right));
  } catch {
    return false;
  }
}

function allowedReviewer(
  review: ReviewCase,
  actor: string,
  phase: "primary" | "appeal",
): boolean {
  const reviewers =
    phase === "primary"
      ? review.policy.primaryReviewers
      : review.policy.appealReviewers;
  if (!reviewers.some((value) => sameWallet(value, actor))) return false;
  const excluded = [
    review.reporter,
    review.target,
    ...review.policy.issuerOperators,
  ];
  if (phase === "appeal")
    excluded.push(...review.primaryVotes.map((vote) => vote.reviewer));
  return !excluded.some((value) => sameWallet(value, actor));
}

function mutationState(
  review: ReviewCase,
  input: Mutation,
): ReviewResult<"replay" | "new"> {
  const previous = review.operationFingerprints[input.operationId];
  if (previous)
    return previous === input.fingerprint
      ? { ok: true, data: "replay" }
      : fail("CONFLICT");
  return review.revision === input.expectedRevision
    ? { ok: true, data: "new" }
    : fail("CONFLICT");
}

function recordMutation(review: ReviewCase, input: Mutation): ReviewCase {
  return {
    ...review,
    revision: review.revision + 1,
    operationFingerprints: {
      ...review.operationFingerprints,
      [input.operationId]: input.fingerprint,
    },
  };
}

function validPolicy(policy: ReviewPolicy): boolean {
  const durations = [
    policy.responseSeconds,
    policy.appealSeconds,
    policy.maxSuspensionSeconds,
  ];
  return (
    Number.isSafeInteger(policy.version) &&
    policy.version > 0 &&
    policy.prohibitedAct.length > 0 &&
    policy.fixtureIds.length > 0 &&
    durations.every(
      (seconds) => Number.isSafeInteger(seconds) && seconds > 0,
    ) &&
    policy.primaryReviewers.length >= 2 &&
    policy.appealReviewers.length >= 2
  );
}

export function receiveReviewCase(input: {
  caseId: string;
  operationId: string;
  reporter: string;
  contact: VerifiedContact;
  fixture: SyntheticFixture;
  policy: ReviewPolicy;
  issuanceId: string;
  now: number;
  existingCases: readonly ReviewCase[];
}): ReviewResult<ReviewCase> {
  const { contact, fixture, policy, now } = input;
  if (
    !validPolicy(policy) ||
    !Number.isSafeInteger(now) ||
    !Number.isSafeInteger(contact.expiresAt) ||
    fixture.summary.length > 1024 ||
    fixture.prohibitedAct !== policy.prohibitedAct ||
    !policy.fixtureIds.includes(fixture.id) ||
    contact.expiresAt <= now
  )
    return fail("INVALID_INPUT");
  if (
    !sameWallet(input.reporter, contact.reporter) ||
    sameWallet(contact.reporter, contact.target)
  )
    return fail("FORBIDDEN");
  const duplicate = input.existingCases.find(
    (review) => review.contactId === contact.id,
  );
  if (duplicate)
    return duplicate.fixtureId === fixture.id
      ? { ok: true, data: duplicate }
      : fail("CONFLICT");
  if (input.existingCases.some((review) => review.caseId === input.caseId))
    return fail("CONFLICT");
  if (
    input.existingCases.some(
      (review) => review.operationFingerprints[input.operationId],
    )
  )
    return fail("CONFLICT");
  return {
    ok: true,
    data: {
      caseId: input.caseId,
      contactId: contact.id,
      reporter: contact.reporter,
      target: contact.target,
      stableSubjectId: contact.stableSubjectId,
      issuanceIdAtOpen: input.issuanceId,
      policy: structuredClone(policy),
      fixtureId: fixture.id,
      syntheticSummary: fixture.summary,
      supportsSuspension: fixture.supportsSuspension,
      state: "received",
      revision: 1,
      openedAt: now,
      reviewNoticeAt: null,
      responseDeadline: null,
      rebuttalFixtureId: null,
      primaryVotes: [],
      decision: null,
      decisionNoticeAt: null,
      appealDeadline: null,
      appealFixtureId: null,
      appealVotes: [],
      isReversed: false,
      closedAt: null,
      operationFingerprints: {
        [input.operationId]: `receive:${contact.id}:${fixture.id}`,
      },
    },
  };
}

export function beginReview(
  review: ReviewCase,
  actor: string,
  input: Mutation,
): ReviewResult<ReviewCase> {
  const check = mutationState(review, input);
  if (!check.ok) return check;
  if (check.data === "replay") return { ok: true, data: review };
  if (!allowedReviewer(review, actor, "primary")) return fail("FORBIDDEN");
  if (review.state !== "received") return fail("CONFLICT");
  return {
    ok: true,
    data: recordMutation({ ...review, state: "reviewing" }, input),
  };
}

export function recordReviewNotice(
  review: ReviewCase,
  deliveredAt: number,
  input: Mutation,
): ReviewResult<ReviewCase> {
  const check = mutationState(review, input);
  if (!check.ok) return check;
  if (check.data === "replay") return { ok: true, data: review };
  if (
    review.state !== "reviewing" ||
    review.reviewNoticeAt !== null ||
    !Number.isSafeInteger(deliveredAt) ||
    deliveredAt < review.openedAt
  )
    return fail("CONFLICT");
  return {
    ok: true,
    data: recordMutation(
      {
        ...review,
        reviewNoticeAt: deliveredAt,
        responseDeadline: deliveredAt + review.policy.responseSeconds,
      },
      input,
    ),
  };
}

export function submitRebuttal(
  review: ReviewCase,
  actor: string,
  fixtureId: string,
  now: number,
  input: Mutation,
): ReviewResult<ReviewCase> {
  const check = mutationState(review, input);
  if (!check.ok) return check;
  if (check.data === "replay") return { ok: true, data: review };
  if (!sameWallet(actor, review.target)) return fail("FORBIDDEN");
  if (review.state !== "reviewing" || review.responseDeadline === null)
    return fail("CONFLICT");
  if (now > review.responseDeadline) return fail("EXPIRED");
  if (!review.policy.fixtureIds.includes(fixtureId))
    return fail("INVALID_INPUT");
  return {
    ok: true,
    data: recordMutation({ ...review, rebuttalFixtureId: fixtureId }, input),
  };
}

function hasTwoMatchingVotes(votes: readonly Vote[]): boolean {
  const latest = votes.at(-1);
  return (
    !!latest &&
    votes.filter(
      (vote) =>
        vote.outcome === latest.outcome &&
        vote.fixtureId === latest.fixtureId &&
        vote.suspendedUntil === latest.suspendedUntil,
    ).length >= 2
  );
}

export function castPrimaryVote(
  review: ReviewCase,
  actor: string,
  choice: {
    outcome: "dismiss" | "suspend";
    fixtureId: string;
    suspendedUntil: number | null;
  },
  now: number,
  input: Mutation,
): ReviewResult<ReviewCase> {
  const check = mutationState(review, input);
  if (!check.ok) return check;
  if (check.data === "replay") return { ok: true, data: review };
  if (!allowedReviewer(review, actor, "primary")) return fail("FORBIDDEN");
  if (review.state !== "reviewing" || review.responseDeadline === null)
    return fail("CONFLICT");
  if (now < review.responseDeadline) return fail("TOO_EARLY");
  if (review.primaryVotes.some((vote) => sameWallet(vote.reviewer, actor)))
    return fail("CONFLICT");
  if (choice.fixtureId !== review.fixtureId) return fail("INVALID_INPUT");
  if (
    choice.outcome === "suspend" &&
    (!review.supportsSuspension ||
      !choice.suspendedUntil ||
      !Number.isSafeInteger(choice.suspendedUntil) ||
      choice.suspendedUntil <= now ||
      choice.suspendedUntil > now + review.policy.maxSuspensionSeconds)
  )
    return fail("INVALID_INPUT");
  if (choice.outcome === "dismiss" && choice.suspendedUntil !== null)
    return fail("INVALID_INPUT");
  const votes = [...review.primaryVotes, { reviewer: actor, ...choice }];
  const agreed = hasTwoMatchingVotes(votes);
  return {
    ok: true,
    data: recordMutation(
      {
        ...review,
        primaryVotes: votes,
        state: agreed ? "decided" : "reviewing",
        decision: agreed
          ? { outcome: choice.outcome, suspendedUntil: choice.suspendedUntil }
          : null,
      },
      input,
    ),
  };
}

export function recordDecisionNotice(
  review: ReviewCase,
  deliveredAt: number,
  input: Mutation,
): ReviewResult<ReviewCase> {
  const check = mutationState(review, input);
  if (!check.ok) return check;
  if (check.data === "replay") return { ok: true, data: review };
  if (
    review.state !== "decided" ||
    review.decisionNoticeAt !== null ||
    !Number.isSafeInteger(deliveredAt) ||
    deliveredAt < review.openedAt
  )
    return fail("CONFLICT");
  return {
    ok: true,
    data: recordMutation(
      {
        ...review,
        decisionNoticeAt: deliveredAt,
        appealDeadline: deliveredAt + review.policy.appealSeconds,
      },
      input,
    ),
  };
}

export function appealReview(
  review: ReviewCase,
  actor: string,
  fixtureId: string,
  now: number,
  input: Mutation,
): ReviewResult<ReviewCase> {
  const check = mutationState(review, input);
  if (!check.ok) return check;
  if (check.data === "replay") return { ok: true, data: review };
  if (!sameWallet(actor, review.target)) return fail("FORBIDDEN");
  if (review.state !== "decided" || review.appealDeadline === null)
    return fail("CONFLICT");
  if (now > review.appealDeadline) return fail("EXPIRED");
  if (!review.policy.fixtureIds.includes(fixtureId))
    return fail("INVALID_INPUT");
  return {
    ok: true,
    data: recordMutation(
      { ...review, state: "appealed", appealFixtureId: fixtureId },
      input,
    ),
  };
}

export function castAppealVote(
  review: ReviewCase,
  actor: string,
  outcome: "reverse" | "uphold",
  now: number,
  input: Mutation,
): ReviewResult<ReviewCase> {
  const check = mutationState(review, input);
  if (!check.ok) return check;
  if (check.data === "replay") return { ok: true, data: review };
  if (!allowedReviewer(review, actor, "appeal")) return fail("FORBIDDEN");
  if (review.state !== "appealed" || !review.decision) return fail("CONFLICT");
  if (review.appealVotes.some((vote) => sameWallet(vote.reviewer, actor)))
    return fail("CONFLICT");
  const votes: Vote[] = [
    ...review.appealVotes,
    {
      reviewer: actor,
      outcome,
      fixtureId: review.appealFixtureId ?? "",
      suspendedUntil: review.decision.suspendedUntil,
    },
  ];
  const agreed = hasTwoMatchingVotes(votes);
  return {
    ok: true,
    data: recordMutation(
      {
        ...review,
        appealVotes: votes,
        state: agreed ? "closed" : "appealed",
        isReversed: agreed && outcome === "reverse",
        closedAt: agreed ? now : null,
      },
      input,
    ),
  };
}

export function closeReviewCase(
  review: ReviewCase,
  now: number,
  input: Mutation,
): ReviewResult<ReviewCase> {
  const check = mutationState(review, input);
  if (!check.ok) return check;
  if (check.data === "replay") return { ok: true, data: review };
  if (review.state !== "decided" || review.appealDeadline === null)
    return fail("CONFLICT");
  if (now <= review.appealDeadline) return fail("TOO_EARLY");
  return {
    ok: true,
    data: recordMutation({ ...review, state: "closed", closedAt: now }, input),
  };
}

export function getEffectiveSuspension(
  stableSubjectId: string,
  cases: readonly ReviewCase[],
  retained: readonly RetainedMeasure[],
  now: number,
): number | null {
  const deadlines = cases
    .filter(
      (review) =>
        review.stableSubjectId === stableSubjectId &&
        review.decision?.outcome === "suspend" &&
        review.decisionNoticeAt !== null &&
        !review.isReversed &&
        (review.decision.suspendedUntil ?? 0) > now,
    )
    .map((review) => review.decision?.suspendedUntil ?? 0);
  deadlines.push(
    ...retained
      .filter(
        (item) =>
          item.stableSubjectId === stableSubjectId && item.suspendedUntil > now,
      )
      .map((item) => item.suspendedUntil),
  );
  return deadlines.length
    ? deadlines.reduce((latest, deadline) => Math.max(latest, deadline), 0)
    : null;
}

export function getPrivateReviewCase(
  review: ReviewCase,
  actor: string,
): ReviewResult<PrivateReviewCase> {
  const isParty =
    sameWallet(actor, review.reporter) || sameWallet(actor, review.target);
  const isAssigned =
    allowedReviewer(review, actor, "primary") ||
    allowedReviewer(review, actor, "appeal");
  if (!isParty && !isAssigned) return fail("NOT_FOUND");
  return {
    ok: true,
    data: {
      caseId: review.caseId,
      policyVersion: review.policy.version,
      prohibitedAct: review.policy.prohibitedAct,
      state: review.state,
      revision: review.revision,
      openedAt: review.openedAt,
      syntheticSummary: review.syntheticSummary,
      responseDeadline: review.responseDeadline,
      appealDeadline: review.appealDeadline,
      suspendedUntil: review.decision?.suspendedUntil ?? null,
    },
  };
}

export function makePublicCredentialDraft(
  current: UnsignedParticipationCredential,
  continuity: SubjectContinuity,
  cases: readonly ReviewCase[],
  retained: readonly RetainedMeasure[],
  policyVersion: number,
  now: number,
): ReviewResult<UnsignedParticipationCredential> {
  if (
    !sameWallet(current.subject, continuity.wallet) ||
    current.issuanceId !== continuity.currentIssuanceId ||
    current.credentialVersion !== continuity.latestCredentialVersion
  )
    return fail("CONFLICT");
  const suspendedUntil = getEffectiveSuspension(
    continuity.stableSubjectId,
    cases,
    retained,
    now,
  );
  return {
    ok: true,
    data: {
      ...current,
      credentialVersion: current.credentialVersion + 1,
      policyVersion,
      status: suspendedUntil === null ? "eligible" : "suspended",
      suspendedUntil,
    },
  };
}

export function compactClosedCases(
  cases: readonly ReviewCase[],
  retained: readonly RetainedMeasure[],
  now: number,
): { cases: ReviewCase[]; retained: RetainedMeasure[] } {
  const remaining: ReviewCase[] = [];
  const measures = retained.filter((item) => item.suspendedUntil > now);
  for (const review of cases) {
    if (review.closedAt === null || now < review.closedAt + RETENTION_SECONDS) {
      remaining.push(review);
      continue;
    }
    const until = review.decision?.suspendedUntil;
    if (
      review.decision?.outcome === "suspend" &&
      review.decisionNoticeAt !== null &&
      !review.isReversed &&
      until &&
      until > now
    ) {
      measures.push({
        stableSubjectId: review.stableSubjectId,
        policyVersion: review.policy.version,
        suspendedUntil: until,
      });
    }
  }
  return { cases: remaining, retained: measures };
}
