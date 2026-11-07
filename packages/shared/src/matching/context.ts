import { encodeAbiParameters, keccak256, stringToHex } from "viem";
import { z } from "zod";

// BN254 Fr is the native Noir Field; Grumpkin's group order is different.
const FIELD_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const hex32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/);
const field = hex32.refine(
  (value) => /^0x[0-9a-fA-F]{64}$/.test(value) && BigInt(value) < FIELD_MODULUS,
);
const positiveVersion = z.number().int().positive().safe();

export const matchParticipantSchema = z.strictObject({
  subjectId: hex32,
  issuanceId: hex32,
  credentialVersion: positiveVersion,
  profileVersion: positiveVersion,
  registrationRoot: field,
  leaseId: hex32,
  leaseVersion: positiveVersion,
  leaseExpiresAt: positiveVersion,
});

export const matchContextSchema = z.strictObject({
  schemaVersion: z.literal(1),
  dictionaryVersion: z.literal(1),
  chainId: z.literal(11155111),
  first: matchParticipantSchema,
  second: matchParticipantSchema,
  firstChallenge: hex32,
  secondChallenge: hex32,
  publicKeyX: field,
  publicKeyY: field,
});

export type MatchContext = z.infer<typeof matchContextSchema>;
export type MatchProofInputs = {
  a: readonly bigint[];
  b: readonly bigint[];
  result: readonly bigint[];
};
export type MatchContextCheck =
  | { ok: true; data: { sessionDigest: bigint } }
  | {
      ok: false;
      error: "INVALID_CONTEXT" | "EXPIRED_LEASE" | "PROOF_CONTEXT_MISMATCH";
    };

function participantHash(participant: MatchContext["first"]): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "uint256" },
        { type: "uint256" },
      ],
      [
        participant.subjectId as `0x${string}`,
        participant.issuanceId as `0x${string}`,
        BigInt(participant.credentialVersion),
        BigInt(participant.profileVersion),
        participant.registrationRoot as `0x${string}`,
        participant.leaseId as `0x${string}`,
        BigInt(participant.leaseVersion),
        BigInt(participant.leaseExpiresAt),
      ],
    ),
  );
}

export function getMatchSessionDigest(context: MatchContext): bigint {
  const encoded = encodeAbiParameters(
    [
      { type: "bytes32" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "bytes32" },
    ],
    [
      keccak256(stringToHex("secret-tinder/matching/synthetic-1")),
      BigInt(context.chainId),
      BigInt(context.schemaVersion),
      BigInt(context.dictionaryVersion),
      participantHash(context.first),
      participantHash(context.second),
      context.firstChallenge as `0x${string}`,
      context.secondChallenge as `0x${string}`,
      context.publicKeyX as `0x${string}`,
      context.publicKeyY as `0x${string}`,
    ],
  );
  return BigInt(keccak256(encoded)) % FIELD_MODULUS;
}

function splitId(value: string): readonly [bigint, bigint] {
  const number = BigInt(value);
  return [number & ((1n << 128n) - 1n), number >> 128n];
}

function matchesParticipant(
  inputs: readonly bigint[],
  participant: MatchContext["first"],
  context: MatchContext,
  digest: bigint,
): boolean {
  const [subjectLo, subjectHi] = splitId(participant.subjectId);
  const [issuanceLo, issuanceHi] = splitId(participant.issuanceId);
  const expected = [
    1n,
    1n,
    subjectLo,
    subjectHi,
    issuanceLo,
    issuanceHi,
    BigInt(participant.profileVersion),
    BigInt(participant.registrationRoot),
    digest,
    BigInt(context.publicKeyX),
    BigInt(context.publicKeyY),
  ];
  return (
    inputs.length === 12 && expected.every((value, i) => inputs[i] === value)
  );
}

export function checkMatchProofContext(
  candidate: unknown,
  inputs: MatchProofInputs,
  nowSeconds: number,
): MatchContextCheck {
  const parsed = matchContextSchema.safeParse(candidate);
  if (!parsed.success || !Number.isSafeInteger(nowSeconds) || nowSeconds < 0) {
    return { ok: false, error: "INVALID_CONTEXT" };
  }
  const context = parsed.data;
  if (
    context.first.subjectId.toLowerCase() ===
      context.second.subjectId.toLowerCase() ||
    BigInt(context.first.subjectId) === 0n ||
    BigInt(context.second.subjectId) === 0n ||
    BigInt(context.first.issuanceId) === 0n ||
    BigInt(context.second.issuanceId) === 0n ||
    BigInt(context.first.leaseId) === 0n ||
    BigInt(context.second.leaseId) === 0n ||
    context.firstChallenge.toLowerCase() ===
      context.secondChallenge.toLowerCase() ||
    BigInt(context.firstChallenge) === 0n ||
    BigInt(context.secondChallenge) === 0n ||
    (BigInt(context.publicKeyX) === 0n && BigInt(context.publicKeyY) === 0n)
  ) {
    return { ok: false, error: "INVALID_CONTEXT" };
  }
  if (
    context.first.leaseExpiresAt <= nowSeconds ||
    context.second.leaseExpiresAt <= nowSeconds
  ) {
    return { ok: false, error: "EXPIRED_LEASE" };
  }
  const digest = getMatchSessionDigest(context);
  const isBound =
    digest !== 0n &&
    matchesParticipant(inputs.a, context.first, context, digest) &&
    matchesParticipant(inputs.b, context.second, context, digest) &&
    inputs.result.length === 10 &&
    inputs.result[0] === digest &&
    inputs.a[11] === inputs.b[11] &&
    inputs.b[11] === inputs.result[1] &&
    inputs.result[2] === BigInt(context.publicKeyX) &&
    inputs.result[3] === BigInt(context.publicKeyY);
  return isBound
    ? { ok: true, data: { sessionDigest: digest } }
    : { ok: false, error: "PROOF_CONTEXT_MISMATCH" };
}
