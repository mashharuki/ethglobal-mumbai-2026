import { type Address, type Hex, keccak256, stringToHex } from "viem";

const CHAIN_ID = 11155111;
const DEPOSIT_LIFETIME_SECONDS = 604_800;
const BASE_TIME = 1_800_000_000;
const VAULT = "0x0000000000000000000000000000000000000100" satisfies Address;
const ALICE = "0x0000000000000000000000000000000000000001" satisfies Address;
const BOB = "0x0000000000000000000000000000000000000002" satisfies Address;
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" satisfies Address;
const EURC = "0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4" satisfies Address;

function syntheticDigest(label: string): Hex {
  return keccak256(stringToHex(`synthetic-note-vector:${label}`));
}

export const noteSignatureDomain = {
  name: "SecretTinderNote",
  version: "1",
  chainId: CHAIN_ID,
  verifyingContract: VAULT,
} as const;

export const lockConsentTypes = {
  LockConsent: [
    { name: "operationId", type: "string" },
    { name: "inputDigest", type: "bytes32" },
    { name: "noteNullifier", type: "bytes32" },
    { name: "deadline", type: "uint64" },
  ],
} as const;

export const acceptanceReceiptTypes = {
  AcceptanceReceipt: [
    { name: "receiptId", type: "string" },
    { name: "operationId", type: "string" },
    { name: "inputDigest", type: "bytes32" },
    { name: "expiresAt", type: "uint64" },
    { name: "issuerKeyVersion", type: "uint32" },
  ],
} as const;

export type SyntheticDeposit = {
  owner: Address;
  token: Address;
  amount: bigint;
  commitment: Hex;
  nullifier: Hex;
  depositedAt: number;
  expiresAt: number;
};

function createDeposit(
  label: string,
  owner: Address,
  token: Address,
  amount: bigint,
): SyntheticDeposit {
  return {
    owner,
    token,
    amount,
    commitment: syntheticDigest(`${label}:commitment`),
    nullifier: syntheticDigest(`${label}:nullifier`),
    depositedAt: BASE_TIME,
    expiresAt: BASE_TIME + DEPOSIT_LIFETIME_SECONDS,
  };
}

export function createNoteVectors(
  trustedCoordinator: Address,
  aliceOwner: Address = ALICE,
  bobOwner: Address = BOB,
) {
  const alice = createDeposit("alice", aliceOwner, USDC, 100_000_000n);
  const bob = createDeposit("bob", bobOwner, EURC, 40_000_000n);
  const inputDigest = syntheticDigest("lock-input");
  const operationId = "ee49dd27-7d5c-40ca-936d-3d0eea326210";
  const acceptanceDeadline = BASE_TIME + 300;
  return {
    chainId: CHAIN_ID,
    vault: VAULT,
    deposits: [alice, bob] as const,
    trustedReceiptKey: { address: trustedCoordinator, version: 1 },
    acceptance: {
      receiptId: "synthetic-receipt-1",
      operationId,
      inputDigest,
      expiresAt: acceptanceDeadline,
      issuerKeyVersion: 1,
    },
    lockConsent: [alice, bob].map((deposit) => ({
      operationId,
      inputDigest,
      noteNullifier: deposit.nullifier,
      deadline: acceptanceDeadline,
    })),
    lockPublic: {
      inputDigest,
      nullifiers: [alice.nullifier, bob.nullifier],
      commitments: [alice.commitment, bob.commitment],
      expiresAt: Math.min(alice.expiresAt, bob.expiresAt),
    },
    settlePayouts: [
      { recipient: alice.owner, token: alice.token, amount: alice.amount },
      { recipient: bob.owner, token: bob.token, amount: bob.amount },
    ],
    oneUnitDeposit: createDeposit("one-unit", aliceOwner, USDC, 101n),
  };
}
