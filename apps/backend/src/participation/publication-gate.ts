import {
  hashParticipationMessage,
  participationCredentialSchema,
  participationTrustSchema,
  unsignedParticipationCredentialSchema,
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

type PublicationInput = {
  expected: unknown;
  signed: unknown;
  trust: unknown;
  observedAt: bigint;
};

type SignedPublication = {
  credential: ReturnType<typeof participationCredentialSchema.parse>;
  publication: PreparedParticipationPublication;
};

export async function prepareSignedCredentialPublication(
  input: PublicationInput,
): Promise<
  { ok: true; data: SignedPublication } | { ok: false; error: string }
> {
  const expected = unsignedParticipationCredentialSchema.safeParse(
    input.expected,
  );
  const signed = participationCredentialSchema.safeParse(input.signed);
  if (!expected.success || !signed.success) {
    return { ok: false, error: "INVALID_CREDENTIAL" };
  }
  if (
    hashParticipationMessage(expected.data) !==
    hashParticipationMessage(signed.data)
  ) {
    return { ok: false, error: "CREDENTIAL_MISMATCH" };
  }
  const prepared = await prepareParticipationPublication(
    signed.data,
    input.trust,
    input.observedAt,
  );
  if (!prepared.ok) return prepared;
  return {
    ok: true,
    data: { credential: signed.data, publication: prepared.data },
  };
}

type ReferenceInput = PublicationInput & {
  row: ParticipationPublicationRow;
  resolver: Address;
};

export async function prepareCredentialReferenceAfterReadback(
  input: ReferenceInput,
): Promise<
  | {
      ok: true;
      data: {
        reference: ReturnType<typeof createCredentialReference>;
        ensUpdate: PlannedEnsCall;
      };
    }
  | { ok: false; error: string }
> {
  const signed = await prepareSignedCredentialPublication(input);
  if (!signed.ok) return signed;
  const trust = participationTrustSchema.safeParse(input.trust);
  if (!trust.success) return { ok: false, error: "REGISTRY_MISMATCH" };
  const reference = createCredentialReference(
    input.row.$key,
    signed.data.publication,
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
        signed.data.credential.dnsName,
        reference,
      ),
    },
  };
}
