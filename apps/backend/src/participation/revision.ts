import {
  type CredentialReference,
  credentialReferenceSchema,
  type ParticipationCredential,
  type ParticipationTrust,
  participationCredentialSchema,
  participationTrustSchema,
  type UnsignedParticipationCredential,
  verifyParticipationSignature,
} from "shared";
import { isAddress, isAddressEqual } from "viem";

type RevisionAction = { type: "suspend"; until: number } | { type: "restore" };

type RevisionInput = {
  previous: unknown;
  currentReference: unknown;
  trust: unknown;
  currentOwner: string;
  currentIssuanceId: string;
  observedAt: bigint;
  action: RevisionAction;
};

type RevisionError =
  | "INVALID_CREDENTIAL"
  | "SIGNATURE_INVALID"
  | "REFERENCE_MISMATCH"
  | "ISSUANCE_MISMATCH"
  | "CREDENTIAL_EXPIRED"
  | "INVALID_SUSPENSION";

type RevisionResult =
  | { ok: true; data: UnsignedParticipationCredential }
  | { ok: false; error: RevisionError };

function checkIdentity(
  previous: ParticipationCredential,
  reference: CredentialReference,
  trust: ParticipationTrust,
  input: RevisionInput,
): RevisionError | null {
  if (
    !isAddress(input.currentOwner) ||
    !isAddressEqual(previous.issuer, trust.issuer) ||
    !isAddressEqual(previous.registry, trust.participantRegistry) ||
    !isAddressEqual(previous.subject, input.currentOwner)
  ) {
    return "REFERENCE_MISMATCH";
  }
  if (
    previous.issuanceId.toLowerCase() !== input.currentIssuanceId.toLowerCase()
  ) {
    return "ISSUANCE_MISMATCH";
  }
  if (previous.credentialVersion !== reference.credentialVersion) {
    return "REFERENCE_MISMATCH";
  }
  if (BigInt(previous.expiresAt) <= input.observedAt) {
    return "CREDENTIAL_EXPIRED";
  }
  return null;
}

function makeRevision(
  previous: ParticipationCredential,
  action: RevisionAction,
): UnsignedParticipationCredential {
  const { signature: _, ...unsigned } = previous;
  return {
    ...unsigned,
    credentialVersion: previous.credentialVersion + 1,
    status: action.type === "suspend" ? "suspended" : "eligible",
    suspendedUntil: action.type === "suspend" ? action.until : null,
  };
}

export async function prepareParticipationRevision(
  input: RevisionInput,
): Promise<RevisionResult> {
  const previous = participationCredentialSchema.safeParse(input.previous);
  const reference = credentialReferenceSchema.safeParse(input.currentReference);
  const trust = participationTrustSchema.safeParse(input.trust);
  if (!previous.success || !reference.success || !trust.success) {
    return { ok: false, error: "INVALID_CREDENTIAL" };
  }
  const signed = await verifyParticipationSignature(previous.data);
  if (!signed.ok) return { ok: false, error: signed.error };
  if (
    signed.data.recordDigest.toLowerCase() !==
    reference.data.digest.toLowerCase()
  ) {
    return { ok: false, error: "REFERENCE_MISMATCH" };
  }
  const identityError = checkIdentity(
    previous.data,
    reference.data,
    trust.data,
    input,
  );
  if (identityError) return { ok: false, error: identityError };
  if (!Number.isSafeInteger(previous.data.credentialVersion + 1)) {
    return { ok: false, error: "INVALID_CREDENTIAL" };
  }
  if (
    input.action.type === "suspend" &&
    (!Number.isSafeInteger(input.action.until) ||
      BigInt(input.action.until) <= input.observedAt ||
      input.action.until > previous.data.expiresAt)
  ) {
    return { ok: false, error: "INVALID_SUSPENSION" };
  }
  return { ok: true, data: makeRevision(previous.data, input.action) };
}
