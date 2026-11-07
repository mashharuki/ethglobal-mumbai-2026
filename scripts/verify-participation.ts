import { createPublicClient as createArkivClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
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
} from "../packages/shared/src/index.ts";
import trustRecord from "../specs/001-private-dating/evidence/ens-trust.json" with {
  type: "json",
};

const runtimeEnv = typeof process === "undefined" ? undefined : process.env;
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
  transport: http(
    runtimeEnv?.SEPOLIA_RPC_URL ??
      "https://ethereum-sepolia-rpc.publicnode.com",
    { retryCount: 0, timeout: 10_000 },
  ),
});
const arkivAccessKey = runtimeEnv?.ARKIV_ACCESS_KEY ?? "";
const arkiv = createArkivClient({
  chain: rabdi({ accessKey: arkivAccessKey }),
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

export async function checkIssuance(
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
  if (
    credential.status === "suspended" &&
    credential.suspendedUntil !== null &&
    BigInt(credential.suspendedUntil) > timestamp
  ) {
    return { verdict: "ineligible", reason: "SUSPENDED" };
  }
  return { verdict: "eligible", reason: null };
}

export async function readCurrentRecords(
  label: string,
  requestedBlock?: bigint,
) {
  const trust = participationTrustSchema.parse(trustRecord);
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

async function inspectCurrent(label: string, requestedBlock?: bigint) {
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
    subject: name.owner,
    credentialGeneration: credential.issuanceId,
    expiresAtMs: credential.expiresAt * 1000,
    maxPerRound: credential.accessTier === "new" ? 1 : 3,
  };
}

async function verifyCurrent(label: string, requestedBlock?: bigint) {
  const {
    subject,
    credentialGeneration,
    expiresAtMs,
    maxPerRound,
    ...publicResult
  } = await inspectCurrent(label, requestedBlock);
  return publicResult;
}

export async function verifyCurrentForAdmission(label: string): Promise<
  | {
      ok: true;
      data: {
        subject: `0x${string}`;
        generation: `0x${string}`;
        version: number;
        status: "eligible" | "suspended";
        expiresAtMs: number;
        maxPerRound: 1 | 3;
      };
    }
  | { ok: false; error: "ineligible" | "unavailable" }
> {
  try {
    const current = await inspectCurrent(label);
    return {
      ok: true,
      data: {
        subject: current.subject,
        generation: current.credentialGeneration as `0x${string}`,
        version: current.credentialVersion,
        status: current.verdict === "eligible" ? "eligible" : "suspended",
        expiresAtMs: current.expiresAtMs,
        maxPerRound: current.maxPerRound as 1 | 3,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof InvalidCredential ? "ineligible" : "unavailable",
    };
  }
}

if (import.meta.main) {
  const label = process.argv[2];
  const blockValue = process.argv[3];
  if (
    !label ||
    !/^[a-z0-9-]+$/.test(label) ||
    normalize(label) !== label ||
    (blockValue && !/^[0-9]+$/.test(blockValue))
  ) {
    throw new Error(
      "Usage: node scripts/verify-participation.ts <label> [sepolia-block]",
    );
  }
  try {
    process.stdout.write(
      `${JSON.stringify(await verifyCurrent(label, blockValue ? BigInt(blockValue) : undefined))}\n`,
    );
  } catch (error) {
    const verdict =
      error instanceof InvalidCredential ? "ineligible" : "unavailable";
    const reason =
      error instanceof InvalidCredential || error instanceof Unavailable
        ? error.code
        : "NETWORK_UNAVAILABLE";
    process.stdout.write(
      `${JSON.stringify({ verdict, reason, dnsName: `${label}.secrettinder.eth` })}\n`,
    );
    process.exitCode = 1;
  }
}
