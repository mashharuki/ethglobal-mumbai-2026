import {
  encodeAbiParameters,
  getAddress,
  type Hex,
  hashTypedData,
  isAddressEqual,
  isHex,
  keccak256,
  recoverTypedDataAddress,
  type TypedDataDefinition,
} from "viem";

import {
  type ParticipationCredential,
  participationCredentialSchema,
  type UnsignedParticipationCredential,
} from "./schema.ts";

export function deriveIssuanceId(
  chainId: number,
  registry: string,
  transactionHash: string,
  logIndex: number,
): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "address" },
        { type: "bytes32" },
        { type: "uint256" },
      ],
      [
        BigInt(chainId),
        getAddress(registry),
        getFixedHex(transactionHash, 66),
        BigInt(logIndex),
      ],
    ),
  );
}

const credentialTypes = {
  Participation: [
    { name: "schemaVersion", type: "uint256" },
    { name: "chainId", type: "uint256" },
    { name: "registry", type: "address" },
    { name: "issuer", type: "address" },
    { name: "subject", type: "address" },
    { name: "dnsName", type: "string" },
    { name: "issuanceId", type: "bytes32" },
    { name: "issuanceEventTransactionHash", type: "bytes32" },
    { name: "issuanceEventLogIndex", type: "uint256" },
    { name: "credentialVersion", type: "uint256" },
    { name: "status", type: "uint8" },
    { name: "expiresAt", type: "uint256" },
    { name: "policyVersion", type: "uint256" },
    { name: "accessTier", type: "uint8" },
    { name: "suspendedUntil", type: "uint256" },
  ],
} as const;

function getFixedHex(value: string, length: number): Hex {
  if (!isHex(value, { strict: true }) || value.length !== length) {
    throw new Error("Invalid fixed-length hex value");
  }
  return value;
}

export function getParticipationTypedData(
  credential: UnsignedParticipationCredential,
): TypedDataDefinition<typeof credentialTypes, "Participation"> {
  return {
    domain: {
      name: "SecretTinderParticipation",
      version: "1",
      chainId: 11155111,
      verifyingContract: getAddress(credential.registry),
    },
    types: credentialTypes,
    primaryType: "Participation",
    message: {
      schemaVersion: BigInt(credential.schemaVersion),
      chainId: BigInt(credential.chainId),
      registry: getAddress(credential.registry),
      issuer: getAddress(credential.issuer),
      subject: getAddress(credential.subject),
      dnsName: credential.dnsName,
      issuanceId: getFixedHex(credential.issuanceId, 66),
      issuanceEventTransactionHash: getFixedHex(
        credential.issuanceEvent.transactionHash,
        66,
      ),
      issuanceEventLogIndex: BigInt(credential.issuanceEvent.logIndex),
      credentialVersion: BigInt(credential.credentialVersion),
      status: credential.status === "eligible" ? 0 : 1,
      expiresAt: BigInt(credential.expiresAt),
      policyVersion: BigInt(credential.policyVersion),
      accessTier: credential.accessTier === "new" ? 0 : 1,
      suspendedUntil: BigInt(credential.suspendedUntil ?? 0),
    },
  };
}

export function hashParticipationMessage(
  credential: UnsignedParticipationCredential,
): Hex {
  return hashTypedData(getParticipationTypedData(credential));
}

export function hashParticipationRecord(
  credential: ParticipationCredential,
): Hex {
  const messageHash = hashParticipationMessage(credential);
  const signature = getFixedHex(credential.signature, 132);
  return keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes" }],
      [messageHash, signature],
    ),
  );
}

export type SignatureCheck =
  | { ok: true; data: { messageDigest: Hex; recordDigest: Hex } }
  | { ok: false; error: "INVALID_CREDENTIAL" | "SIGNATURE_INVALID" };

export async function verifyParticipationSignature(
  value: unknown,
): Promise<SignatureCheck> {
  const parsed = participationCredentialSchema.safeParse(value);
  if (!parsed.success) return { ok: false, error: "INVALID_CREDENTIAL" };

  const credential = parsed.data;
  try {
    const expectedIssuanceId = deriveIssuanceId(
      credential.chainId,
      credential.registry,
      credential.issuanceEvent.transactionHash,
      credential.issuanceEvent.logIndex,
    );
    if (credential.issuanceId.toLowerCase() !== expectedIssuanceId) {
      return { ok: false, error: "INVALID_CREDENTIAL" };
    }
    const signer = await recoverTypedDataAddress({
      ...getParticipationTypedData(credential),
      signature: getFixedHex(credential.signature, 132),
    });
    if (!isAddressEqual(signer, getAddress(credential.issuer))) {
      return { ok: false, error: "SIGNATURE_INVALID" };
    }
    return {
      ok: true,
      data: {
        messageDigest: hashParticipationMessage(credential),
        recordDigest: hashParticipationRecord(credential),
      },
    };
  } catch {
    return { ok: false, error: "SIGNATURE_INVALID" };
  }
}
