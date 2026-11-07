import type { SearchLeaseRequest } from "shared";
import { isAddressEqual } from "viem";

type Evidence<T> =
  | { ok: true; data: T }
  | { ok: false; error: "ineligible" | "unavailable" };

export type VerifiedCredential = {
  subject: `0x${string}`;
  generation: `0x${string}`;
  version: number;
  status: "eligible" | "suspended";
  expiresAtMs: number;
  maxPerRound: 1 | 3;
};

export type VerifiedRegistration = {
  owner: `0x${string}`;
  version: number;
  expiresAtMs: number;
};

export type ConfirmedDeposit = {
  owner: `0x${string}`;
  expiresAtMs: number;
};

export type SearchAdmissionReaders = {
  verifyOwnerSignature: (
    subject: `0x${string}`,
    request: SearchLeaseRequest,
  ) => Promise<boolean>;
  readCredential: (
    subject: `0x${string}`,
  ) => Promise<Evidence<VerifiedCredential>>;
  readRegistration: (
    subject: `0x${string}`,
  ) => Promise<Evidence<VerifiedRegistration>>;
  readDeposit: (subject: `0x${string}`) => Promise<Evidence<ConfirmedDeposit>>;
};

export type SearchAdmission = Evidence<{
  registrationVersion: number;
  maxPerRound: 1 | 3;
  maxExpiresAt: number;
}>;

export function isCredentialCurrent(
  credential: VerifiedCredential,
  subject: `0x${string}`,
  request: SearchLeaseRequest,
  nowMs: number,
): boolean {
  return (
    isAddressEqual(credential.subject, subject) &&
    credential.generation.toLowerCase() ===
      request.credentialGeneration.toLowerCase() &&
    credential.version === request.credentialVersion &&
    credential.status === "eligible" &&
    credential.expiresAtMs > nowMs
  );
}

function isRegistrationCurrent(
  registration: VerifiedRegistration,
  subject: `0x${string}`,
  request: SearchLeaseRequest,
  nowMs: number,
): boolean {
  return (
    isAddressEqual(registration.owner, subject) &&
    registration.version === request.registrationVersion &&
    registration.expiresAtMs > nowMs
  );
}

export async function authorizeSearchLease(
  subject: `0x${string}`,
  request: SearchLeaseRequest,
  nowMs: number,
  readers: SearchAdmissionReaders,
): Promise<SearchAdmission> {
  if (!(await readers.verifyOwnerSignature(subject, request))) {
    return { ok: false, error: "ineligible" };
  }
  const credential = await readers.readCredential(subject);
  if (!credential.ok) return credential;
  if (!isCredentialCurrent(credential.data, subject, request, nowMs)) {
    return { ok: false, error: "ineligible" };
  }
  const registration = await readers.readRegistration(subject);
  if (!registration.ok) return registration;
  if (!isRegistrationCurrent(registration.data, subject, request, nowMs)) {
    return { ok: false, error: "ineligible" };
  }
  const deposit = await readers.readDeposit(subject);
  if (!deposit.ok) return deposit;
  if (
    !isAddressEqual(deposit.data.owner, subject) ||
    deposit.data.expiresAtMs <= nowMs
  ) {
    return { ok: false, error: "ineligible" };
  }
  return {
    ok: true,
    data: {
      registrationVersion: registration.data.version,
      maxPerRound: credential.data.maxPerRound,
      maxExpiresAt: Math.min(
        credential.data.expiresAtMs,
        registration.data.expiresAtMs,
        deposit.data.expiresAtMs,
        nowMs + 7 * 86_400_000,
      ),
    },
  };
}
