export type ReviewPreviewFixture = {
  viewerSubject: string;
  participation: {
    subject: string;
    status: "eligible" | "suspended";
    policyVersion: string;
    accessTier: "new" | "standard";
    suspendedUntil: string | null;
  };
  notice: {
    subject: string;
    state: "received" | "reviewing" | "decided" | "appealed" | "closed";
    rule: string;
    reasonSummary: string;
    evidenceSummary: string;
    responseDeadline: string;
    appealDeadline: string;
    responseState: "not_submitted" | "submitted";
    appealState: "not_submitted" | "submitted";
  };
  contactBlock: { subject: string; isActive: boolean };
};

export type OwnedReviewPreview = Omit<ReviewPreviewFixture, "viewerSubject">;

// Display-only guard for fictional data. Real access control belongs in the
// authenticated private API; a caller-supplied subject is never authentication.
export function selectOwnedReviewPreview(
  fixture: ReviewPreviewFixture,
): OwnedReviewPreview | null {
  const subject = fixture.viewerSubject;
  if (
    !subject ||
    fixture.participation.subject !== subject ||
    fixture.notice.subject !== subject ||
    fixture.contactBlock.subject !== subject
  ) {
    return null;
  }
  return {
    participation: fixture.participation,
    notice: fixture.notice,
    contactBlock: fixture.contactBlock,
  };
}
