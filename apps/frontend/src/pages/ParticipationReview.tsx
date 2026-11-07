import { Lism, Stack } from "lism-css/react";

import {
  type OwnedReviewPreview,
  type ReviewPreviewFixture,
  selectOwnedReviewPreview,
} from "./participation-review-preview.ts";

const caseStateText = {
  received: "Received",
  reviewing: "Under review",
  decided: "Decided",
  appealed: "Appeal under review",
  closed: "Closed",
} as const;

function Deadline({ label, value }: { label: string; value: string }) {
  return (
    <Lism as="p">
      {label}:{" "}
      <time dateTime={value}>
        {new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}{" "}
        IST
      </time>
    </Lism>
  );
}

function ParticipationState({ view }: { view: OwnedReviewPreview }) {
  const { participation } = view;
  return (
    <Stack as="article" p="20" g="10" bgc="base" bdrs="10">
      <Lism as="h4" fz="l">
        Participation status (synthetic)
      </Lism>
      <Lism as="p">
        {participation.status === "suspended" ? "Suspended" : "Eligible"} ·
        Access tier {participation.accessTier === "new" ? "New" : "Standard"} ·
        Policy version {participation.policyVersion}
      </Lism>
      {participation.suspendedUntil ? (
        <Deadline
          label="Suspension ends"
          value={participation.suspendedUntil}
        />
      ) : null}
      <Lism as="p" c="text-2" fz="s">
        The access tier is not a credit score. An appeal does not automatically
        lift a suspension.
      </Lism>
    </Stack>
  );
}

function PrivateNotice({ view }: { view: OwnedReviewPreview }) {
  const { notice } = view;
  return (
    <Stack as="article" p="20" g="10" bgc="base" bdrs="10">
      <Lism as="h4" fz="l">
        Your private review notice (synthetic)
      </Lism>
      <Lism as="p">
        Status: {caseStateText[notice.state]} · Rule: {notice.rule}
      </Lism>
      <Lism as="p">Reason: {notice.reasonSummary}</Lism>
      <Lism as="p">Evidence summary: {notice.evidenceSummary}</Lism>
      <Deadline label="Response deadline" value={notice.responseDeadline} />
      <Deadline label="Appeal deadline" value={notice.appealDeadline} />
      <Lism as="p">
        Response:{" "}
        {notice.responseState === "submitted" ? "Submitted" : "Not submitted"} ·
        Appeal:{" "}
        {notice.appealState === "submitted" ? "Submitted" : "Not submitted"}
      </Lism>
      <Lism as="p" c="text-2" fz="s">
        You cannot submit from this preview until the authenticated private API
        is connected. Silence is not consent.
      </Lism>
    </Stack>
  );
}

function RemedyBoundary({ view }: { view: OwnedReviewPreview }) {
  return (
    <Stack as="article" p="20" g="10" bgc="base" bdrs="10">
      <Lism as="h4" fz="l">
        Contact block and remedies
      </Lism>
      <Lism as="p">
        Contact with the other person:{" "}
        {view.contactBlock.isActive ? "Blocked" : "Not blocked"}
      </Lism>
      <Lism as="p" c="text-2" fz="s">
        A personal block applies to new contact and invitations. It does not
        change the other person&apos;s credential or existing refund rights.
      </Lism>
      <Lism as="p" c="text-2" fz="s">
        The design keeps evidence, responses, appeals, and recovery of existing
        funds available during suspension or appeal. This preview is not
        connected to fund operations.
      </Lism>
    </Stack>
  );
}

export default function ParticipationReview({
  fixture,
}: {
  fixture: ReviewPreviewFixture;
}) {
  const view = selectOwnedReviewPreview(fixture);
  if (!view) {
    return (
      <Lism as="section">This private review information is unavailable.</Lism>
    );
  }
  return (
    <Stack as="section" p="30" g="20" bgc="base-2" bdrs="20">
      <Stack g="10">
        <Lism as="h3" fz="xl">
          Participation and remedies
        </Lism>
        <Lism as="p" c="text-2" fz="s">
          This is an isolated preview with synthetic data. It is not connected
          to authentication, the private API, or live credential updates.
        </Lism>
      </Stack>
      <ParticipationState view={view} />
      <PrivateNotice view={view} />
      <RemedyBoundary view={view} />
    </Stack>
  );
}
