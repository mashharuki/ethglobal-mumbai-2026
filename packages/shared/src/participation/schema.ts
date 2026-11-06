import { isAddress, isAddressEqual, isHex, zeroAddress } from "viem";
import { z } from "zod";

const addressSchema = z.string().refine(isAddress, "Invalid EVM address");
const bytes32Schema = z
  .string()
  .refine(
    (value) => isHex(value, { strict: true }) && value.length === 66,
    "Expected bytes32",
  );
const signatureSchema = z
  .string()
  .refine(
    (value) => isHex(value, { strict: true }) && value.length === 132,
    "Expected 65-byte signature",
  );

const participationCredentialFields = z.strictObject({
  schemaVersion: z.literal(1),
  chainId: z.literal(11155111),
  registry: addressSchema,
  issuer: addressSchema,
  subject: addressSchema,
  dnsName: z.string().min(3).max(255),
  issuanceId: bytes32Schema,
  issuanceEvent: z.strictObject({
    transactionHash: bytes32Schema,
    logIndex: z.number().int().nonnegative(),
  }),
  credentialVersion: z.number().int().positive(),
  status: z.enum(["eligible", "suspended"]),
  expiresAt: z.number().int().positive(),
  policyVersion: z.number().int().positive(),
  accessTier: z.enum(["new", "standard"]),
  suspendedUntil: z.number().int().positive().nullable(),
});

type SuspensionFields = {
  status: "eligible" | "suspended";
  suspendedUntil: number | null;
};

function checkSuspension(
  value: SuspensionFields,
  context: z.RefinementCtx,
): void {
  const hasSuspension = value.suspendedUntil !== null;
  if ((value.status === "suspended") !== hasSuspension) {
    context.addIssue({
      code: "custom",
      message: "Suspension status and deadline must agree",
      path: ["suspendedUntil"],
    });
  }
}

export const unsignedParticipationCredentialSchema =
  participationCredentialFields.superRefine(checkSuspension);
export type UnsignedParticipationCredential = z.infer<
  typeof unsignedParticipationCredentialSchema
>;

export const participationCredentialSchema = participationCredentialFields
  .extend({ signature: signatureSchema })
  .superRefine(checkSuspension);

export type ParticipationCredential = z.infer<
  typeof participationCredentialSchema
>;

export const credentialReferenceSchema = z.strictObject({
  schemaVersion: z.literal(1),
  arkivEntityKey: bytes32Schema,
  digest: bytes32Schema,
  credentialVersion: z.number().int().positive(),
});

export type CredentialReference = z.infer<typeof credentialReferenceSchema>;

export const participationTrustAnchor = {
  chainId: 11155111,
  namespace: "secrettinder.eth",
  parentRegistry: "0xD4eBcbBdF463C9c45784603Db0dDD499BC44A8B4",
  issuer: "0xcA341CE4902756bF9e96e145014DD0aB36A0Fe8E",
  deploymentVersion: "07e55a056f5b6a9c90119f501bdd05714e67dddd",
} as const;

export const participationTrustSchema = z
  .strictObject({
    chainId: z.literal(11155111),
    namespace: z.string().min(3),
    parentRegistry: addressSchema,
    participantRegistry: addressSchema,
    issuer: addressSchema,
    deploymentVersion: z.literal(participationTrustAnchor.deploymentVersion),
    participantRegistryCodeHash: bytes32Schema,
    resolverImplementationCodeHash: bytes32Schema,
  })
  .superRefine((value, context) => {
    if (value.namespace !== participationTrustAnchor.namespace) {
      context.addIssue({
        code: "custom",
        message: "Untrusted namespace",
        path: ["namespace"],
      });
    }
    if (
      !isAddressEqual(
        value.parentRegistry,
        participationTrustAnchor.parentRegistry,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Untrusted parent Registry",
        path: ["parentRegistry"],
      });
    }
    if (!isAddressEqual(value.issuer, participationTrustAnchor.issuer)) {
      context.addIssue({
        code: "custom",
        message: "Untrusted issuer",
        path: ["issuer"],
      });
    }
    if (isAddressEqual(value.participantRegistry, zeroAddress)) {
      context.addIssue({
        code: "custom",
        message: "Participant Registry is not deployed",
        path: ["participantRegistry"],
      });
    }
  });

export type ParticipationTrust = z.infer<typeof participationTrustSchema>;

export const participationParentSnapshotSchema = z.strictObject({
  chainId: z.literal(11155111),
  blockNumber: z.number().int().positive(),
  namespace: z.string().min(3),
  issuer: addressSchema,
  observedOwner: addressSchema,
  parentRegistry: addressSchema,
  parentResolver: addressSchema,
  parentNameExpiresAt: z.number().int().positive(),
  parentNameTokenId: z.string().regex(/^[0-9]+$/),
  subregistry: addressSchema,
  universalHelper: addressSchema,
  universalHelperCodeHash: bytes32Schema,
  parentRegistryCodeHash: bytes32Schema,
  parentResolverCodeHash: bytes32Schema,
  deploymentVersion: z.literal(participationTrustAnchor.deploymentVersion),
  parentPermissions: z.strictObject({
    blockNumber: z.number().int().positive(),
    account: addressSchema,
    canSetSubregistry: z.boolean(),
  }),
  abiSource: z.url(),
});

export type ParticipationParentSnapshot = z.infer<
  typeof participationParentSnapshotSchema
>;

export const participationVerdicts = [
  "eligible",
  "ineligible",
  "unavailable",
] as const;
export type ParticipationVerdict = (typeof participationVerdicts)[number];

export const participationErrors = [
  "NAME_EXPIRED",
  "CREDENTIAL_EXPIRED",
  "CREDENTIAL_EXPIRY_TOO_LONG",
  "SUSPENDED",
  "ISSUER_MISMATCH",
  "NAMESPACE_MISMATCH",
  "REGISTRY_MISMATCH",
  "ISSUANCE_MISMATCH",
  "REFERENCE_MISMATCH",
  "DIGEST_MISMATCH",
  "SIGNATURE_INVALID",
  "VERSION_STALE",
  "ENS_UNAVAILABLE",
  "ARKIV_UNAVAILABLE",
] as const;
export type ParticipationError = (typeof participationErrors)[number];

export const participationPermissionTable = {
  issuer: [
    "issue-subname",
    "renew-subname",
    "replace-resolver",
    "set-app-credential",
    "suspend",
    "recover",
  ],
  owner: ["set-app-endpoint", "set-app-key"],
  delegatedKey: ["set-app-endpoint", "set-app-key"],
} as const;
