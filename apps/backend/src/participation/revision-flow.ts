import type { Address } from "viem";

import type { ParticipationPublicationRow } from "./publication.ts";
import {
  prepareCredentialReferenceAfterReadback,
  prepareSignedCredentialPublication,
} from "./publication-gate.ts";
import { prepareParticipationRevision } from "./revision.ts";

type RevisionInput = Parameters<typeof prepareParticipationRevision>[0];

function revisionError(error: string): string {
  return error === "CREDENTIAL_MISMATCH" ? "REVISION_MISMATCH" : error;
}

export async function prepareSignedRevisionPublication(
  input: RevisionInput & { signedRevision: unknown },
) {
  const draft = await prepareParticipationRevision(input);
  if (!draft.ok) return draft;
  const result = await prepareSignedCredentialPublication({
    expected: draft.data,
    signed: input.signedRevision,
    trust: input.trust,
    observedAt: input.observedAt,
  });
  if (!result.ok)
    return { ok: false as const, error: revisionError(result.error) };
  return result;
}

export async function prepareRevisionReferenceAfterReadback(
  input: RevisionInput & {
    signedRevision: unknown;
    row: ParticipationPublicationRow;
    resolver: Address;
  },
) {
  const draft = await prepareParticipationRevision(input);
  if (!draft.ok) return draft;
  const result = await prepareCredentialReferenceAfterReadback({
    expected: draft.data,
    signed: input.signedRevision,
    trust: input.trust,
    observedAt: input.observedAt,
    row: input.row,
    resolver: input.resolver,
  });
  if (!result.ok)
    return { ok: false as const, error: revisionError(result.error) };
  return result;
}
