import { createPublicClient as createArkivClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { eq } from "@arkiv-network/sdk/query";
import { bytes, defineSchema, str, u64 } from "@arkiv-network/sdk/schema";
import {
  createPublicClient as createEthClient,
  decodeFunctionResult,
  encodeFunctionData,
  hexToString,
  http,
  isAddressEqual,
  keccak256,
  namehash,
  parseAbi,
  parseEventLogs,
  stringToHex,
  toHex,
  zeroAddress,
} from "viem";
import { sepolia } from "viem/chains";
import { normalize, packetToBytes } from "viem/ens";
import {
  credentialReferenceSchema,
  participationCredentialSchema,
  participationTrustSchema,
  verifyParticipationSignature,
} from "../../../../packages/shared/src/index.ts";
import trustRecord from "../../../../specs/001-private-dating/evidence/ens-trust.json" with {
  type: "json",
};

const trustConfiguration = participationTrustSchema.parse(trustRecord);
const registryAbi = parseAbi([
  "function findTokenId(string label) view returns (uint256)",
  "function getOwner(uint256 anyId) view returns (address)",
  "function getExpiry(uint256 anyId) view returns (uint64)",
  "function getResource(uint256 anyId) view returns (uint256)",
  "function getResolver(string label) view returns (address)",
  "function getSubregistry(string label) view returns (address)",
  "function roles(uint256 resource, address account) view returns (uint256)",
]);
const resolverAbi = parseAbi([
  "function resolve(bytes name, bytes data) view returns (bytes)",
  "function roles(uint256 resource, address account) view returns (uint256)",
  "function hasRoles(uint256 resource, uint256 roleBitmap, address account) view returns (bool)",
]);
const textAbi = parseAbi([
  "function text(bytes32 node, string key) view returns (string)",
]);
const factoryAbi = parseAbi([
  "function verifyContract(address proxy) view returns (address implementation)",
]);
const eventsAbi = parseAbi([
  "event LabelRegistered(uint256 indexed tokenId, bytes32 indexed labelHash, string label, address owner, uint64 expiry, address indexed sender)",
  "event TokenResource(uint256 indexed tokenId, uint256 indexed resource)",
]);
const publicationSchema = defineSchema("secret_tinder_participation_v1", {
  issuance_id: str().indexed(),
  credential_version: u64().indexed(),
  record_digest: str(),
  media_type: str(),
  content: bytes(),
});
const eth = createEthClient({
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com", {
    retryCount: 0,
    timeout: 10_000,
  }),
});
const arkiv = createArkivClient({
  chain: rabdi({ accessKey: "" }),
  transport: http(undefined, { retryCount: 0, timeout: 10_000 }),
});

class InvalidCredential extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

class Unavailable extends Error {
  readonly code: "ENS_UNAVAILABLE" | "ARKIV_UNAVAILABLE";

  constructor(code: "ENS_UNAVAILABLE" | "ARKIV_UNAVAILABLE") {
    super(code);
    this.code = code;
  }
}

type Trust = ReturnType<typeof participationTrustSchema.parse>;
type Reference = ReturnType<typeof credentialReferenceSchema.parse>;
type Credential = ReturnType<typeof participationCredentialSchema.parse>;

function parseJson(value: string, error: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new InvalidCredential(error);
  }
}

export async function fromNetwork<T>(
  operation: () => Promise<T>,
  code: "ENS_UNAVAILABLE" | "ARKIV_UNAVAILABLE",
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof InvalidCredential) throw error;
    throw new Unavailable(code);
  }
}

async function checkParent(
  trust: Trust,
  blockNumber: bigint,
  timestamp: bigint,
) {
  const parentToken = await eth.readContract({
    address: trust.parentRegistry,
    abi: registryAbi,
    functionName: "findTokenId",
    args: ["secrettinder"],
    blockNumber,
  });
  const [parentOwner, parentExpiry, subregistry, registryCode] =
    await Promise.all([
      eth.readContract({
        address: trust.parentRegistry,
        abi: registryAbi,
        functionName: "getOwner",
        args: [parentToken],
        blockNumber,
      }),
      eth.readContract({
        address: trust.parentRegistry,
        abi: registryAbi,
        functionName: "getExpiry",
        args: [parentToken],
        blockNumber,
      }),
      eth.readContract({
        address: trust.parentRegistry,
        abi: registryAbi,
        functionName: "getSubregistry",
        args: ["secrettinder"],
        blockNumber,
      }),
      eth.getCode({ address: trust.participantRegistry, blockNumber }),
    ]);
  if (
    !isAddressEqual(parentOwner, trust.issuer) ||
    parentExpiry <= timestamp ||
    !isAddressEqual(subregistry, trust.participantRegistry) ||
    !registryCode ||
    keccak256(registryCode) !== trust.participantRegistryCodeHash
  ) {
    throw new InvalidCredential("REGISTRY_MISMATCH");
  }
}

async function readParticipant(
  label: string,
  trust: Trust,
  blockNumber: bigint,
  timestamp: bigint,
) {
  const token = await eth.readContract({
    address: trust.participantRegistry,
    abi: registryAbi,
    functionName: "findTokenId",
    args: [label],
    blockNumber,
  });
  const [owner, expiry, resource, resolver] = await Promise.all([
    eth.readContract({
      address: trust.participantRegistry,
      abi: registryAbi,
      functionName: "getOwner",
      args: [token],
      blockNumber,
    }),
    eth.readContract({
      address: trust.participantRegistry,
      abi: registryAbi,
      functionName: "getExpiry",
      args: [token],
      blockNumber,
    }),
    eth.readContract({
      address: trust.participantRegistry,
      abi: registryAbi,
      functionName: "getResource",
      args: [token],
      blockNumber,
    }),
    eth.readContract({
      address: trust.participantRegistry,
      abi: registryAbi,
      functionName: "getResolver",
      args: [label],
      blockNumber,
    }),
  ]);
  if (expiry <= timestamp) throw new InvalidCredential("NAME_EXPIRED");
  if (isAddressEqual(resolver, zeroAddress))
    throw new InvalidCredential("REFERENCE_MISMATCH");
  return { owner, resource, resolver };
}

async function readReference(
  dnsName: string,
  resolver: `0x${string}`,
  trust: Trust,
  blockNumber: bigint,
) {
  const implementation = await eth.readContract({
    address: "0xDa70306C98E97eCe36F997a21368e53298572991",
    abi: factoryAbi,
    functionName: "verifyContract",
    args: [resolver],
    blockNumber,
  });
  const code = await eth.getCode({ address: implementation, blockNumber });
  if (!code || keccak256(code) !== trust.resolverImplementationCodeHash) {
    throw new InvalidCredential("REGISTRY_MISMATCH");
  }
  const profile = encodeFunctionData({
    abi: textAbi,
    functionName: "text",
    args: [namehash(dnsName), "app.credential"],
  });
  const answer = await eth.readContract({
    address: resolver,
    abi: resolverAbi,
    functionName: "resolve",
    args: [toHex(packetToBytes(dnsName)), profile],
    blockNumber,
  });
  const value = decodeFunctionResult({
    abi: textAbi,
    functionName: "text",
    data: answer,
  });
  if (!value) throw new InvalidCredential("REFERENCE_MISMATCH");
  const parsed = credentialReferenceSchema.safeParse(
    parseJson(value, "REFERENCE_MISMATCH"),
  );
  if (!parsed.success) throw new InvalidCredential("REFERENCE_MISMATCH");
  return parsed.data;
}

async function readRegistryRoles(
  name: Awaited<ReturnType<typeof readParticipant>>,
  trust: Trust,
  blockNumber: bigint,
) {
  const [scoped, root] = await Promise.all([
    eth.readContract({
      address: trust.participantRegistry,
      abi: registryAbi,
      functionName: "roles",
      args: [name.resource, name.owner],
      blockNumber,
    }),
    eth.readContract({
      address: trust.participantRegistry,
      abi: registryAbi,
      functionName: "roles",
      args: [0n, name.owner],
      blockNumber,
    }),
  ]);
  return { scoped, root };
}

async function readResolverRoles(
  name: Awaited<ReturnType<typeof readParticipant>>,
  trust: Trust,
  blockNumber: bigint,
) {
  const resource = BigInt(keccak256(stringToHex("app.credential")));
  const [root, ownerCanChange, issuerCanChange] = await Promise.all([
    eth.readContract({
      address: name.resolver,
      abi: resolverAbi,
      functionName: "roles",
      args: [0n, name.owner],
      blockNumber,
    }),
    eth.readContract({
      address: name.resolver,
      abi: resolverAbi,
      functionName: "hasRoles",
      args: [resource, 1n << 4n, name.owner],
      blockNumber,
    }),
    eth.readContract({
      address: name.resolver,
      abi: resolverAbi,
      functionName: "hasRoles",
      args: [resource, 1n << 4n, trust.issuer],
      blockNumber,
    }),
  ]);
  return { root, ownerCanChange, issuerCanChange };
}

async function checkPermissions(
  name: Awaited<ReturnType<typeof readParticipant>>,
  trust: Trust,
  blockNumber: bigint,
) {
  const [registry, resolver] = await Promise.all([
    readRegistryRoles(name, trust, blockNumber),
    readResolverRoles(name, trust, blockNumber),
  ]);
  if (
    registry.scoped !== 0n ||
    registry.root !== 0n ||
    resolver.root !== 0n ||
    resolver.ownerCanChange ||
    !resolver.issuerCanChange
  ) {
    throw new InvalidCredential("REGISTRY_MISMATCH");
  }
}

async function checkIssuance(
  credential: Credential,
  label: string,
  trust: Trust,
  resource: bigint,
  blockNumber: bigint,
) {
  const receipt = await eth.getTransactionReceipt({
    hash: credential.issuanceEvent.transactionHash as `0x${string}`,
  });
  if (receipt.status !== "success" || receipt.blockNumber > blockNumber) {
    throw new InvalidCredential("ISSUANCE_MISMATCH");
  }
  const events = parseEventLogs({ abi: eventsAbi, logs: receipt.logs });
  const registration = events.find(
    (event) =>
      event.eventName === "LabelRegistered" &&
      event.logIndex === credential.issuanceEvent.logIndex &&
      isAddressEqual(event.address, trust.participantRegistry) &&
      event.args.label === label &&
      event.args.labelHash === keccak256(stringToHex(label)) &&
      isAddressEqual(event.args.owner, credential.subject) &&
      isAddressEqual(event.args.sender, trust.issuer),
  );
  if (registration?.eventName !== "LabelRegistered") {
    throw new InvalidCredential("ISSUANCE_MISMATCH");
  }
  const hasResource = events.some(
    (event) =>
      event.eventName === "TokenResource" &&
      isAddressEqual(event.address, trust.participantRegistry) &&
      event.args.tokenId === registration.args.tokenId &&
      event.args.resource === resource,
  );
  if (!hasResource) throw new InvalidCredential("ISSUANCE_MISMATCH");
}

async function readPublication(reference: Reference, trust: Trust) {
  const row = await arkiv.getEntity(
    reference.arkivEntityKey as `0x${string}`,
    publicationSchema,
  );
  if (
    !isAddressEqual(row.$creator, trust.issuer) ||
    !isAddressEqual(row.$owner, trust.issuer) ||
    !row.$creationFlags.readonly ||
    row.$creationFlags.permissionlessExtension ||
    row.media_type.value !== "application/json" ||
    row.credential_version.value !== BigInt(reference.credentialVersion) ||
    row.record_digest.value.toLowerCase() !== reference.digest.toLowerCase()
  ) {
    throw new InvalidCredential("REFERENCE_MISMATCH");
  }
  let content: string;
  try {
    content = hexToString(row.content.value);
  } catch {
    throw new InvalidCredential("INVALID_CREDENTIAL");
  }
  const parsed = participationCredentialSchema.safeParse(
    parseJson(content, "INVALID_CREDENTIAL"),
  );
  if (!parsed.success) throw new InvalidCredential("INVALID_CREDENTIAL");
  return { credential: parsed.data, issuanceId: row.issuance_id.value };
}

async function queryHistoryRows(issuanceId: string, trust: Trust) {
  return arkiv
    .select({
      $key: true,
      $creator: true,
      $owner: true,
      $creationFlags: true,
      issuance_id: true,
      credential_version: true,
      record_digest: true,
      media_type: true,
      content: true,
    })
    .from(publicationSchema, { onMismatch: "throw" })
    .createdBy(trust.issuer)
    .where(eq("issuance_id", issuanceId))
    .withCount()
    .limit(20)
    .fetch();
}

type HistoryRow = Awaited<
  ReturnType<typeof queryHistoryRows>
>["entities"][number];

async function checkHistoryRow(
  row: HistoryRow,
  context: Awaited<ReturnType<typeof readCurrentRecords>>,
) {
  const { trust, name, dnsName, issuanceId, reference } = context;
  if (
    !isAddressEqual(row.$creator, trust.issuer) ||
    !isAddressEqual(row.$owner, trust.issuer) ||
    !row.$creationFlags.readonly ||
    row.$creationFlags.permissionlessExtension ||
    row.issuance_id.value.toLowerCase() !== issuanceId.toLowerCase() ||
    row.media_type.value !== "application/json"
  ) {
    throw new InvalidCredential("HISTORY_MISMATCH");
  }
  let content: string;
  try {
    content = hexToString(row.content.value);
  } catch {
    throw new InvalidCredential("HISTORY_MISMATCH");
  }
  const parsed = participationCredentialSchema.safeParse(
    parseJson(content, "HISTORY_MISMATCH"),
  );
  const historicalReference = credentialReferenceSchema.safeParse({
    schemaVersion: 1,
    arkivEntityKey: row.$key,
    digest: row.record_digest.value,
    credentialVersion: Number(row.credential_version.value),
  });
  if (!parsed.success || !historicalReference.success) {
    throw new InvalidCredential("HISTORY_MISMATCH");
  }
  await checkCredential(
    parsed.data,
    issuanceId,
    historicalReference.data,
    trust,
    name.owner,
    dnsName,
  );
  return {
    version: parsed.data.credentialVersion,
    status: parsed.data.status,
    isCurrent:
      row.$key.toLowerCase() === reference.arkivEntityKey.toLowerCase(),
  };
}

export type ParticipationHistoryResult =
  | {
      ok: true;
      data: {
        versions: Awaited<ReturnType<typeof checkHistoryRow>>[];
        arkivBlockNumber: string;
        isTruncated: boolean;
      };
    }
  | { ok: false; error: "HISTORY_UNAVAILABLE" | "HISTORY_MISMATCH" };

export async function readParticipationHistory(
  label: "alice" | "bob",
): Promise<ParticipationHistoryResult> {
  try {
    const context = await readCurrentRecords(label);
    const { credential, issuanceId, reference, trust, name, dnsName, block } =
      context;
    await checkCredential(
      credential,
      issuanceId,
      reference,
      trust,
      name.owner,
      dnsName,
    );
    await checkIssuance(credential, label, trust, name.resource, block.number);
    const page = await queryHistoryRows(issuanceId, trust);
    const versions = await Promise.all(
      page.entities.map((row) => checkHistoryRow(row, context)),
    );
    if (!versions.some((item) => item.isCurrent)) {
      return { ok: false, error: "HISTORY_MISMATCH" };
    }
    versions.sort((a, b) => a.version - b.version);
    return {
      ok: true,
      data: {
        versions,
        arkivBlockNumber: page.blockNumber.toString(),
        isTruncated: page.count > BigInt(page.entities.length),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof InvalidCredential
          ? "HISTORY_MISMATCH"
          : "HISTORY_UNAVAILABLE",
    };
  }
}

export async function checkCredential(
  credential: Credential,
  issuanceId: string,
  reference: Reference,
  trust: Trust,
  owner: `0x${string}`,
  dnsName: string,
) {
  const signed = await verifyParticipationSignature(credential);
  if (!signed.ok) throw new InvalidCredential(signed.error);
  if (
    !isAddressEqual(credential.issuer, trust.issuer) ||
    !isAddressEqual(credential.registry, trust.participantRegistry) ||
    !isAddressEqual(credential.subject, owner) ||
    credential.dnsName !== dnsName ||
    credential.issuanceId.toLowerCase() !== issuanceId.toLowerCase() ||
    credential.credentialVersion !== reference.credentialVersion ||
    signed.data.recordDigest.toLowerCase() !== reference.digest.toLowerCase()
  ) {
    throw new InvalidCredential("REFERENCE_MISMATCH");
  }
}

export function checkCredentialStatus(
  credential: Credential,
  timestamp: bigint,
): { verdict: "eligible" | "ineligible"; reason: string | null } {
  if (BigInt(credential.expiresAt) <= timestamp) {
    return { verdict: "ineligible", reason: "CREDENTIAL_EXPIRED" };
  }
  const isSuspended =
    credential.status === "suspended" &&
    credential.suspendedUntil !== null &&
    BigInt(credential.suspendedUntil) > timestamp;
  return {
    verdict: isSuspended ? "ineligible" : "eligible",
    reason: isSuspended ? "SUSPENDED" : null,
  };
}

async function readCurrentRecords(label: string, requestedBlock?: bigint) {
  const trust = trustConfiguration;
  const block = await fromNetwork(
    () =>
      eth.getBlock(
        requestedBlock ? { blockNumber: requestedBlock } : undefined,
      ),
    "ENS_UNAVAILABLE",
  );
  const dnsName = `${label}.${trust.namespace}`;
  await fromNetwork(
    () => checkParent(trust, block.number, block.timestamp),
    "ENS_UNAVAILABLE",
  );
  const name = await fromNetwork(
    () => readParticipant(label, trust, block.number, block.timestamp),
    "ENS_UNAVAILABLE",
  );
  await fromNetwork(
    () => checkPermissions(name, trust, block.number),
    "ENS_UNAVAILABLE",
  );
  const reference = await fromNetwork(
    () => readReference(dnsName, name.resolver, trust, block.number),
    "ENS_UNAVAILABLE",
  );
  const { credential, issuanceId } = await fromNetwork(
    () => readPublication(reference, trust),
    "ARKIV_UNAVAILABLE",
  );
  return { trust, block, dnsName, name, reference, credential, issuanceId };
}

async function verifyCurrent(
  label: string,
  requestedBlock?: bigint,
): Promise<VerificationResult> {
  const { trust, block, dnsName, name, reference, credential, issuanceId } =
    await readCurrentRecords(label, requestedBlock);
  await checkCredential(
    credential,
    issuanceId,
    reference,
    trust,
    name.owner,
    dnsName,
  );
  await fromNetwork(
    () => checkIssuance(credential, label, trust, name.resource, block.number),
    "ENS_UNAVAILABLE",
  );
  if (BigInt(credential.expiresAt) <= block.timestamp)
    throw new InvalidCredential("CREDENTIAL_EXPIRED");
  const status = checkCredentialStatus(credential, block.timestamp);
  return {
    ...status,
    ensBlockNumber: block.number.toString(),
    credentialVersion: credential.credentialVersion,
    dnsName,
  };
}

export type VerificationResult = {
  verdict: "eligible" | "ineligible" | "unavailable";
  reason: string | null;
  dnsName: string;
  ensBlockNumber?: string;
  credentialVersion?: number;
};

export async function verifyParticipation(
  label: string,
  requestedBlock?: bigint,
): Promise<VerificationResult> {
  const dnsName = `${label}.secrettinder.eth`;
  try {
    if (!/^[a-z0-9-]+$/.test(label) || normalize(label) !== label) {
      return { verdict: "ineligible", reason: "INVALID_NAME", dnsName };
    }
    return await verifyCurrent(label, requestedBlock);
  } catch (error) {
    return {
      verdict:
        error instanceof InvalidCredential ? "ineligible" : "unavailable",
      reason:
        error instanceof InvalidCredential || error instanceof Unavailable
          ? error.code
          : "NETWORK_UNAVAILABLE",
      dnsName,
    };
  }
}
