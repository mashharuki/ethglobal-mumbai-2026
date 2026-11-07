import { Lism, Stack } from "lism-css/react";
import { useState } from "react";

import type { PrivateReviewCase } from "../../../../packages/shared/src/index.ts";
import {
  createPrivateReviewApi,
  signInForReview,
  type WalletProvider,
} from "./participation-review-live.ts";
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

function getBrowserWallet(): WalletProvider | null {
  const browserWindow = window as Window & { ethereum?: WalletProvider };
  return browserWindow.ethereum ?? null;
}

function LiveCase({ review }: { review: PrivateReviewCase }) {
  return (
    <Stack as="article" p="20" g="10" bgc="base" bdrs="10">
      <Lism as="h4" fz="l">
        Your private review case
      </Lism>
      <Lism as="p">Rule: {review.prohibitedAct}</Lism>
      <Lism as="p">
        State: {caseStateText[review.state]} · Policy version{" "}
        {review.policyVersion}
      </Lism>
      {review.syntheticSummary ? (
        <Lism as="p">Synthetic evidence: {review.syntheticSummary}</Lism>
      ) : null}
      {review.responseDeadline ? (
        <Deadline
          label="Response deadline"
          value={review.responseDeadline.toISOString()}
        />
      ) : null}
      {review.appealDeadline ? (
        <Deadline
          label="Appeal deadline"
          value={review.appealDeadline.toISOString()}
        />
      ) : null}
      {review.suspendedUntil ? (
        <Deadline
          label="Decision's suspension deadline"
          value={review.suspendedUntil.toISOString()}
        />
      ) : null}
      <Lism as="p" c="text-2" fz="s">
        A case decision is separate from the public ENS/Arkiv credential. A
        response or appeal does not automatically restore eligibility or change
        existing refund rights.
      </Lism>
    </Stack>
  );
}

export function LiveParticipationReview() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [caseId, setCaseId] = useState("");
  const [fixtureId, setFixtureId] = useState("");
  const [review, setReview] = useState<PrivateReviewCase | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");
  const api = createPrivateReviewApi();

  async function connectWallet(): Promise<void> {
    const wallet = getBrowserWallet();
    if (!wallet) {
      setMessage("A Sepolia wallet is required to open a private case.");
      return;
    }
    setIsBusy(true);
    setWalletAddress(null);
    setReview(null);
    setMessage("");
    try {
      setWalletAddress(await signInForReview(api, wallet));
      setMessage("Signed in for 15 minutes. Enter your case ID to continue.");
    } catch {
      setMessage(
        "Sign-in failed. Check Sepolia and the wallet signature request.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function loadCase(): Promise<void> {
    if (!walletAddress) return;
    setIsBusy(true);
    setReview(null);
    setMessage("");
    try {
      setReview(await api.getCase(caseId.trim()));
    } catch {
      setMessage("Case unavailable. Check its ID and your signed-in wallet.");
    } finally {
      setIsBusy(false);
    }
  }

  async function submit(action: "response" | "appeal"): Promise<void> {
    if (!review || !walletAddress) return;
    setIsBusy(true);
    setMessage("");
    try {
      await api.submitCase(action, review, fixtureId.trim());
      setReview(await api.getCase(review.caseId));
      setMessage(
        action === "response" ? "Response recorded." : "Appeal recorded.",
      );
    } catch {
      setMessage(
        "Request was not accepted. Refresh the case and check its deadline.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Stack as="section" p="30" g="20" bgc="base-2" bdrs="20">
      <Lism as="h3" fz="xl">
        Private participation review
      </Lism>
      <Lism as="p" c="text-2" fz="s">
        This requires the private API on the same site. A case ID is never put
        in the URL or public credential. Only synthetic fixture IDs are
        accepted.
      </Lism>
      <button
        type="button"
        disabled={isBusy}
        onClick={() => void connectWallet()}
      >
        {walletAddress ? "Renew wallet session" : "Sign in with Sepolia wallet"}
      </button>
      {walletAddress ? (
        <Stack g="10">
          <Lism as="p">Wallet: {walletAddress}</Lism>
          <label htmlFor="private-case-id">Private case ID</label>
          <input
            id="private-case-id"
            value={caseId}
            maxLength={128}
            disabled={isBusy}
            onChange={(event) => {
              setCaseId(event.target.value);
              setFixtureId("");
              setReview(null);
            }}
          />
          <button
            type="button"
            disabled={isBusy || !caseId.trim()}
            onClick={() => void loadCase()}
          >
            Open my case
          </button>
        </Stack>
      ) : null}
      {review ? (
        <Stack g="10">
          <LiveCase review={review} />
          {review.state === "reviewing" || review.state === "decided" ? (
            <>
              <label htmlFor="review-fixture-id">Synthetic fixture ID</label>
              <input
                id="review-fixture-id"
                value={fixtureId}
                maxLength={128}
                disabled={isBusy}
                onChange={(event) => setFixtureId(event.target.value)}
              />
              {review.state === "reviewing" ? (
                <button
                  type="button"
                  disabled={isBusy || !fixtureId.trim()}
                  onClick={() => void submit("response")}
                >
                  Submit response
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isBusy || !fixtureId.trim()}
                  onClick={() => void submit("appeal")}
                >
                  Submit appeal
                </button>
              )}
            </>
          ) : null}
        </Stack>
      ) : null}
      {message ? (
        <Lism as="p" role="status">
          {message}
        </Lism>
      ) : null}
    </Stack>
  );
}
