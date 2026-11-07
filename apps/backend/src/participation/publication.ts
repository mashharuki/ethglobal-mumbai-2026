import {
  type CreateEntityOptions,
  ExpirationTime,
  type FullRow,
} from "@arkiv-network/sdk";
import {
  bytes,
  type CreateEntityValues,
  defineSchema,
  str,
  u64,
} from "@arkiv-network/sdk/schema";
import {
  type CredentialReference,
  credentialReferenceSchema,
  type ParticipationCredential,
  type ParticipationTrust,
  participationCredentialSchema,
  participationTrustSchema,
  verifyParticipationSignature,
} from "shared";
import { getAddress, type Hex, hexToString, isAddressEqual } from "viem";
import { normalize } from "viem/ens";

export const ParticipationPublications = defineSchema(
  "secret_tinder_participation_v1",
  {
    issuance_id: str().indexed(),
    credential_version: u64().indexed(),
    record_digest: str(),
    media_type: str(),
    content: bytes(),
  },
);

export type PreparedParticipationPublication = {
  schema: typeof ParticipationPublications;
  values: CreateEntityValues<typeof ParticipationPublications>;
  options: CreateEntityOptions;
  recordDigest: Hex;
  credentialVersion: number;
};

type PreparationResult =
  | { ok: true; data: PreparedParticipationPublication }
  | {
      ok: false;
      error:
        | "INVALID_CREDENTIAL"
        | "SIGNATURE_INVALID"
        | "ISSUER_MISMATCH"
        | "REGISTRY_MISMATCH"
        | "NAMESPACE_MISMATCH"
        | "CREDENTIAL_EXPIRED"
        | "CREDENTIAL_EXPIRY_TOO_LONG";
    };
type PreparationError = Extract<PreparationResult, { ok: false }>["error"];

function checkCredentialTrust(
  credential: ParticipationCredential,
  trust: ParticipationTrust,
  blockTimestamp: bigint,
): PreparationError | null {
  if (
    !isAddressEqual(getAddress(credential.issuer), getAddress(trust.issuer))
  ) {
    return "ISSUER_MISMATCH";
  }
  if (
    !isAddressEqual(
      getAddress(credential.registry),
      getAddress(trust.participantRegistry),
    )
  ) {
    return "REGISTRY_MISMATCH";
  }
  const prefix = credential.dnsName.slice(0, -trust.namespace.length - 1);
  if (
    !credential.dnsName.endsWith(`.${trust.namespace}`) ||
    !prefix ||
    prefix.includes(".") ||
    normalize(credential.dnsName) !== credential.dnsName
  ) {
    return "NAMESPACE_MISMATCH";
  }
  if (BigInt(credential.expiresAt) <= blockTimestamp)
    return "CREDENTIAL_EXPIRED";
  if (BigInt(credential.expiresAt) - blockTimestamp > 29n * 86_400n)
    return "CREDENTIAL_EXPIRY_TOO_LONG";
  return null;
}

export async function prepareParticipationPublication(
  value: unknown,
  trustValue: unknown,
  blockTimestamp: bigint,
): Promise<PreparationResult> {
  const trust = participationTrustSchema.safeParse(trustValue);
  if (!trust.success) return { ok: false, error: "REGISTRY_MISMATCH" };
  const parsed = participationCredentialSchema.safeParse(value);
  if (!parsed.success) return { ok: false, error: "INVALID_CREDENTIAL" };

  try {
    const trustError = checkCredentialTrust(
      parsed.data,
      trust.data,
      blockTimestamp,
    );
    if (trustError) return { ok: false, error: trustError };
    const signature = await verifyParticipationSignature(parsed.data);
    if (!signature.ok) return { ok: false, error: signature.error };
    const credential = parsed.data;
    return {
      ok: true,
      data: {
        schema: ParticipationPublications,
        values: {
          issuance_id: credential.issuanceId,
          credential_version: u64(BigInt(credential.credentialVersion)),
          record_digest: signature.data.recordDigest,
          media_type: "application/json",
          content: new TextEncoder().encode(JSON.stringify(credential)),
        },
        options: {
          expiration: ExpirationTime.fromDays(30),
          flags: { readonly: true, permissionlessExtension: false },
        },
        recordDigest: signature.data.recordDigest,
        credentialVersion: credential.credentialVersion,
      },
    };
  } catch {
    return { ok: false, error: "INVALID_CREDENTIAL" };
  }
}

export function createCredentialReference(
  entityKey: Hex,
  publication: PreparedParticipationPublication,
): CredentialReference {
  return credentialReferenceSchema.parse({
    schemaVersion: 1,
    arkivEntityKey: entityKey,
    digest: publication.recordDigest,
    credentialVersion: publication.credentialVersion,
  });
}

export type ParticipationPublicationRow = Pick<
  FullRow<typeof ParticipationPublications>,
  | "$key"
  | "$owner"
  | "$creator"
  | "$creationFlags"
  | "issuance_id"
  | "credential_version"
  | "record_digest"
  | "media_type"
  | "content"
>;

export type PublicationReadbackResult =
  | { ok: true; data: ParticipationCredential }
  | {
      ok: false;
      error:
        | "REFERENCE_MISMATCH"
        | "DIGEST_MISMATCH"
        | "INVALID_CREDENTIAL"
        | "SIGNATURE_INVALID"
        | "ISSUER_MISMATCH"
        | "REGISTRY_MISMATCH"
        | "NAMESPACE_MISMATCH"
        | "CREDENTIAL_EXPIRED"
        | "CREDENTIAL_EXPIRY_TOO_LONG";
    };

export async function verifyPublicationReadback(
  row: ParticipationPublicationRow,
  reference: CredentialReference,
  trust: ParticipationTrust,
  blockTimestamp: bigint,
): Promise<PublicationReadbackResult> {
  if (
    row.$key.toLowerCase() !== reference.arkivEntityKey.toLowerCase() ||
    !isAddressEqual(row.$owner, trust.issuer) ||
    !isAddressEqual(row.$creator, trust.issuer) ||
    !row.$creationFlags.readonly ||
    row.$creationFlags.permissionlessExtension ||
    row.media_type.value !== "application/json" ||
    row.credential_version.value !== BigInt(reference.credentialVersion)
  ) {
    return { ok: false, error: "REFERENCE_MISMATCH" };
  }
  if (
    row.record_digest.value.toLowerCase() !== reference.digest.toLowerCase()
  ) {
    return { ok: false, error: "DIGEST_MISMATCH" };
  }
  try {
    const parsed = participationCredentialSchema.safeParse(
      JSON.parse(hexToString(row.content.value)),
    );
    if (!parsed.success) return { ok: false, error: "INVALID_CREDENTIAL" };
    const credential = parsed.data;
    const prepared = await prepareParticipationPublication(
      credential,
      trust,
      blockTimestamp,
    );
    if (!prepared.ok) return prepared;
    if (
      row.issuance_id.value.toLowerCase() !==
        credential.issuanceId.toLowerCase() ||
      prepared.data.credentialVersion !== reference.credentialVersion
    ) {
      return { ok: false, error: "REFERENCE_MISMATCH" };
    }
    if (
      prepared.data.recordDigest.toLowerCase() !==
      reference.digest.toLowerCase()
    ) {
      return { ok: false, error: "DIGEST_MISMATCH" };
    }
    return { ok: true, data: credential };
  } catch {
    return { ok: false, error: "INVALID_CREDENTIAL" };
  }
}
