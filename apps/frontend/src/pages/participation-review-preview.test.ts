/// <reference types="node" />

import assert from "node:assert/strict";
import { it } from "node:test";

import {
  type ReviewPreviewFixture,
  selectOwnedReviewPreview,
} from "./participation-review-preview.ts";

const fixture = {
  viewerSubject: "synthetic-a",
  participation: {
    subject: "synthetic-a",
    status: "suspended",
    policyVersion: "synthetic-policy-1",
    accessTier: "new",
    suspendedUntil: "2026-11-07T06:00:00Z",
  },
  notice: {
    subject: "synthetic-a",
    state: "appealed",
    rule: "Synthetic rule: prohibited solicitation",
    reasonSummary: "A synthetic initial decision is under appeal.",
    evidenceSummary:
      "Summary of fictional contact logs; no real person is involved.",
    responseDeadline: "2026-11-07T03:00:00Z",
    appealDeadline: "2026-11-07T05:00:00Z",
    responseState: "submitted",
    appealState: "submitted",
  },
  contactBlock: { subject: "synthetic-a", isActive: true },
} satisfies ReviewPreviewFixture;

it("should show the owner's rule, summary, deadlines and separate block", () => {
  const view = selectOwnedReviewPreview(fixture);
  assert.ok(view);
  assert.equal(view.notice.rule, "Synthetic rule: prohibited solicitation");
  assert.equal(view.notice.appealState, "submitted");
  assert.equal(view.participation.status, "suspended");
  assert.equal(view.contactBlock.isActive, true);
  assert.equal(view.participation.suspendedUntil, "2026-11-07T06:00:00Z");
});

it("should return no private data for another viewer", () => {
  const otherViewer = { ...fixture, viewerSubject: "synthetic-b" };
  const view = selectOwnedReviewPreview(otherViewer);
  assert.equal(view, null);
  assert.doesNotMatch(
    JSON.stringify(view),
    /contact logs|solicitation|appealed/,
  );
});

it("should reject a mixed-subject notice or block", () => {
  const otherNotice = {
    ...fixture,
    notice: { ...fixture.notice, subject: "synthetic-b" },
  };
  const otherBlock = {
    ...fixture,
    contactBlock: { ...fixture.contactBlock, subject: "synthetic-b" },
  };
  assert.equal(selectOwnedReviewPreview(otherNotice), null);
  assert.equal(selectOwnedReviewPreview(otherBlock), null);
});

it("should not treat an appeal as automatic recovery", () => {
  const view = selectOwnedReviewPreview(fixture);
  assert.ok(view);
  assert.equal(view.notice.state, "appealed");
  assert.equal(view.participation.status, "suspended");
});
