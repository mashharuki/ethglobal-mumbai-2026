import {
  hashParticipationMessage,
  participationCredentialSchema,
  participationTrustSchema,
} from "shared";
import type { Address } from "viem";

import {
  type PlannedEnsCall,
  planCredentialReferenceUpdate,
} from "./ens-plan.ts";
import {
  createCredentialReference,
  type ParticipationPublicationRow,
  type PreparedParticipationPublication,
  prepareParticipationPublication,
  verifyPublicationReadback,
} from "./publication.ts";
import { prepareParticipationRevision } from "./revision.ts";

type RevisionInput = Parameters<typeof prepareParticipationRevision>[0];
type RevisionPublicationResult =
  | {
      ok: true;
      data: {
        publication: PreparedParticipationPublication;
        credential: ReturnType<typeof participationCredentialSchema.parse>;
      };
    }
  | { ok: false; error: string };

export async function prepareSignedRevisionPublication(
  input: RevisionInput & { signedRevision: unknown },
): Promise<RevisionPublicationResult> {
  const draft = await prepareParticipationRevision(input);
  if (!draft.ok) return draft;
  const signed = participationCredentialSchema.safeParse(input.signedRevision);
  if (!signed.success) return { ok: false, error: "INVALID_CREDENTIAL" };
  if (
    hashParticipationMessage(draft.data) !==
    hashParticipationMessage(signed.data)
  ) {
    return { ok: false, error: "REVISION_MISMATCH" };
  }
  const prepared = await prepareParticipationPublication(
    signed.data,
    input.trust,
    input.observedAt,
  );
  if (!prepared.ok) return prepared;
  return {
    ok: true,
    data: { publication: prepared.data, credential: signed.data },
  };
}

type RevisionReferenceResult =
  | {
      ok: true;
      data: {
        reference: ReturnType<typeof createCredentialReference>;
        ensUpdate: PlannedEnsCall;
      };
    }
  | { ok: false; error: string };

export async function prepareRevisionReferenceAfterReadback(
  input: RevisionInput & {
    signedRevision: unknown;
    row: ParticipationPublicationRow;
    resolver: Address;
  },
): Promise<RevisionReferenceResult> {
  const prepared = await prepareSignedRevisionPublication(input);
  if (!prepared.ok) return prepared;
  const trust = participationTrustSchema.safeParse(input.trust);
  if (!trust.success) return { ok: false, error: "REGISTRY_MISMATCH" };
  const reference = createCredentialReference(
    input.row.$key,
    prepared.data.publication,
  );
  const readback = await verifyPublicationReadback(
    input.row,
    reference,
    trust.data,
    input.observedAt,
  );
  if (!readback.ok) return readback;
  return {
    ok: true,
    data: {
      reference,
      ensUpdate: planCredentialReferenceUpdate(
        input.resolver,
        prepared.data.credential.dnsName,
        reference,
      ),
    },
  };
}
