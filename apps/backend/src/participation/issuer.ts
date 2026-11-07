import {
  deriveIssuanceId,
  type ParticipationTrust,
  participationTrustSchema,
} from "shared";
import {
  type Address,
  getAddress,
  isAddressEqual,
  keccak256,
  parseAbi,
  parseEventLogs,
  stringToHex,
  type TransactionReceipt,
} from "viem";
import { normalize } from "viem/ens";

const registrationEvents = parseAbi([
  "event LabelRegistered(uint256 indexed tokenId, bytes32 indexed labelHash, string label, address owner, uint64 expiry, address indexed sender)",
  "event TokenResource(uint256 indexed tokenId, uint256 indexed resource)",
]);

type Receipt = Pick<
  TransactionReceipt,
  "status" | "transactionHash" | "blockNumber" | "logs"
>;

type RegistrationEvidence = {
  trust: ParticipationTrust;
  receipt: Receipt;
  observedBlockNumber: bigint;
  observedBlockTimestamp: bigint;
  label: string;
  subject: string;
  currentOwner: string;
  currentExpiry: bigint;
  currentResource: bigint;
};

export type RegistrationEvidenceResult =
  | {
      ok: true;
      data: {
        dnsName: string;
        issuanceId: `0x${string}`;
        issuanceEvent: { transactionHash: `0x${string}`; logIndex: number };
        resource: bigint;
      };
    }
  | {
      ok: false;
      error: "REGISTRY_MISMATCH" | "ISSUANCE_MISMATCH" | "NAME_EXPIRED";
    };

function findRegistration(
  input: RegistrationEvidence,
  registry: Address,
  subject: Address,
) {
  const events = parseEventLogs({
    abi: registrationEvents,
    logs: input.receipt.logs,
  });
  const registration = events.find(
    (event) =>
      event.eventName === "LabelRegistered" &&
      isAddressEqual(event.address, registry) &&
      event.args.label === input.label &&
      event.args.labelHash === keccak256(stringToHex(input.label)) &&
      isAddressEqual(event.args.owner, subject) &&
      isAddressEqual(event.args.sender, input.trust.issuer),
  );
  if (registration?.eventName !== "LabelRegistered") return null;
  const resource = events.find(
    (event) =>
      event.eventName === "TokenResource" &&
      isAddressEqual(event.address, registry) &&
      event.args.tokenId === registration.args.tokenId &&
      event.args.resource === input.currentResource,
  );
  if (!resource || registration.logIndex === null) return null;
  return registration;
}

export function verifyRegistrationEvidence(
  input: RegistrationEvidence,
): RegistrationEvidenceResult {
  if (!participationTrustSchema.safeParse(input.trust).success) {
    return { ok: false, error: "REGISTRY_MISMATCH" };
  }
  if (input.currentExpiry <= input.observedBlockTimestamp) {
    return { ok: false, error: "NAME_EXPIRED" };
  }
  if (
    input.receipt.status !== "success" ||
    input.receipt.blockNumber > input.observedBlockNumber
  ) {
    return { ok: false, error: "ISSUANCE_MISMATCH" };
  }
  try {
    const label = normalize(input.label);
    if (label !== input.label || label.includes(".")) {
      return { ok: false, error: "ISSUANCE_MISMATCH" };
    }
    const registry = getAddress(input.trust.participantRegistry);
    const subject = getAddress(input.subject);
    const registration = findRegistration(input, registry, subject);
    if (
      !registration ||
      !isAddressEqual(getAddress(input.currentOwner), subject) ||
      input.currentExpiry < registration.args.expiry
    ) {
      return { ok: false, error: "ISSUANCE_MISMATCH" };
    }
    return {
      ok: true,
      data: {
        dnsName: `${label}.${input.trust.namespace}`,
        issuanceId: deriveIssuanceId(
          input.trust.chainId,
          registry,
          input.receipt.transactionHash,
          registration.logIndex,
        ),
        issuanceEvent: {
          transactionHash: input.receipt.transactionHash,
          logIndex: registration.logIndex,
        },
        resource: input.currentResource,
      },
    };
  } catch {
    return { ok: false, error: "ISSUANCE_MISMATCH" };
  }
}
