import { readFile } from "node:fs/promises";

import {
  type Address,
  createPublicClient,
  getAddress,
  http,
  isAddressEqual,
  isHex,
  keccak256,
  parseAbi,
  zeroAddress,
} from "viem";
import { sepolia } from "viem/chains";

import { ensSepoliaDeployment } from "../apps/backend/src/participation/ens-plan.ts";
import {
  type RegistrationEvidenceResult,
  verifyRegistrationEvidence,
} from "../apps/backend/src/participation/issuer.ts";
import {
  getParticipationTypedData,
  hashParticipationMessage,
} from "../packages/shared/src/participation/credential.ts";
import {
  type ParticipationTrust,
  participationTrustAnchor,
  participationTrustSchema,
  type UnsignedParticipationCredential,
} from "../packages/shared/src/participation/schema.ts";

const registryAbi = parseAbi([
  "function findTokenId(string label) view returns (uint256)",
  "function getOwner(uint256 anyId) view returns (address)",
  "function getExpiry(uint256 anyId) view returns (uint64)",
  "function getResource(uint256 anyId) view returns (uint256)",
  "function getSubregistry(string label) view returns (address)",
  "function getResolver(string label) view returns (address)",
]);
const factoryAbi = parseAbi([
  "function verifyContract(address proxy) view returns (address implementation)",
]);
const client = createPublicClient({
  chain: sepolia,
  transport: http(
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: This standalone CLI is not cached by Turbo.
    process.env.SEPOLIA_RPC_URL ??
      "https://ethereum-sepolia-rpc.publicnode.com",
    { retryCount: 2, timeout: 15_000 },
  ),
});

async function readTrust(path: string): Promise<ParticipationTrust> {
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  return participationTrustSchema.parse(value);
}

async function verifyParent(
  trust: ParticipationTrust,
  blockNumber: bigint,
  timestamp: bigint,
): Promise<void> {
  const label = participationTrustAnchor.namespace.split(".")[0];
  const tokenId = await client.readContract({
    address: trust.parentRegistry,
    abi: registryAbi,
    functionName: "findTokenId",
    args: [label],
    blockNumber,
  });
  const [owner, expiry, subregistry] = await Promise.all([
    client.readContract({
      address: trust.parentRegistry,
      abi: registryAbi,
      functionName: "getOwner",
      args: [tokenId],
      blockNumber,
    }),
    client.readContract({
      address: trust.parentRegistry,
      abi: registryAbi,
      functionName: "getExpiry",
      args: [tokenId],
      blockNumber,
    }),
    client.readContract({
      address: trust.parentRegistry,
      abi: registryAbi,
      functionName: "getSubregistry",
      args: [label],
      blockNumber,
    }),
  ]);
  if (
    !isAddressEqual(owner, trust.issuer) ||
    expiry <= timestamp ||
    !isAddressEqual(subregistry, trust.participantRegistry)
  ) {
    throw new Error("Untrusted parent name or subregistry");
  }
}

async function verifyDeployment(
  trust: ParticipationTrust,
  resolver: `0x${string}`,
  blockNumber: bigint,
): Promise<void> {
  const [registryCode, resolverImplCode, registryImpl, resolverImpl] =
    await Promise.all([
      client.getCode({ address: trust.participantRegistry, blockNumber }),
      client.getCode({
        address: ensSepoliaDeployment.resolverImplementation,
        blockNumber,
      }),
      client.readContract({
        address: ensSepoliaDeployment.factory,
        abi: factoryAbi,
        functionName: "verifyContract",
        args: [trust.participantRegistry],
        blockNumber,
      }),
      client.readContract({
        address: ensSepoliaDeployment.factory,
        abi: factoryAbi,
        functionName: "verifyContract",
        args: [resolver],
        blockNumber,
      }),
    ]);
  if (
    !registryCode ||
    !resolverImplCode ||
    registryCode === "0x" ||
    resolverImplCode === "0x"
  ) {
    throw new Error("ENS deployment code is missing");
  }
  if (
    keccak256(registryCode).toLowerCase() !==
      trust.participantRegistryCodeHash.toLowerCase() ||
    keccak256(resolverImplCode).toLowerCase() !==
      trust.resolverImplementationCodeHash.toLowerCase() ||
    !isAddressEqual(
      registryImpl,
      ensSepoliaDeployment.userRegistryImplementation,
    ) ||
    !isAddressEqual(resolverImpl, ensSepoliaDeployment.resolverImplementation)
  ) {
    throw new Error("ENS Factory provenance or implementation mismatch");
  }
}

async function readParticipant(
  trust: ParticipationTrust,
  label: string,
  blockNumber: bigint,
) {
  const registry = trust.participantRegistry;
  const tokenId = await client.readContract({
    address: registry,
    abi: registryAbi,
    functionName: "findTokenId",
    args: [label],
    blockNumber,
  });
  const [owner, expiry, resource, resolver] = await Promise.all([
    client.readContract({
      address: registry,
      abi: registryAbi,
      functionName: "getOwner",
      args: [tokenId],
      blockNumber,
    }),
    client.readContract({
      address: registry,
      abi: registryAbi,
      functionName: "getExpiry",
      args: [tokenId],
      blockNumber,
    }),
    client.readContract({
      address: registry,
      abi: registryAbi,
      functionName: "getResource",
      args: [tokenId],
      blockNumber,
    }),
    client.readContract({
      address: registry,
      abi: registryAbi,
      functionName: "getResolver",
      args: [label],
      blockNumber,
    }),
  ]);
  if (resolver === zeroAddress)
    throw new Error("Participant Resolver is not connected");
  return { owner, expiry, resource, resolver };
}

function makeCredential(
  trust: ParticipationTrust,
  subject: Address,
  registration: Extract<RegistrationEvidenceResult, { ok: true }>["data"],
  expiry: bigint,
): UnsignedParticipationCredential {
  return {
    schemaVersion: 1,
    chainId: trust.chainId,
    registry: trust.participantRegistry,
    issuer: trust.issuer,
    subject,
    dnsName: registration.dnsName,
    issuanceId: registration.issuanceId,
    issuanceEvent: registration.issuanceEvent,
    credentialVersion: 1,
    status: "eligible",
    expiresAt: Number(expiry),
    policyVersion: 1,
    accessTier: "new",
    suspendedUntil: null,
  } satisfies UnsignedParticipationCredential;
}

async function main(): Promise<void> {
  const [txHashValue, label, subjectValue, trustPath] = process.argv.slice(2);
  if (
    !txHashValue ||
    !isHex(txHashValue, { strict: true }) ||
    txHashValue.length !== 66 ||
    !label ||
    !subjectValue ||
    !trustPath
  ) {
    throw new Error(
      "Usage: node scripts/issue-participation.ts <registrationTxHash> <label> <subjectAddress> <trust.json>",
    );
  }
  const trust = await readTrust(trustPath);
  const subject = getAddress(subjectValue);
  if ((await client.getChainId()) !== trust.chainId)
    throw new Error("Wrong chain");
  const block = await client.getBlock({ blockTag: "latest" });
  const [receipt, participant] = await Promise.all([
    client.getTransactionReceipt({ hash: txHashValue }),
    readParticipant(trust, label, block.number),
  ]);
  await verifyParent(trust, block.number, block.timestamp);
  await verifyDeployment(trust, participant.resolver, block.number);
  const evidence = verifyRegistrationEvidence({
    trust,
    receipt,
    observedBlockNumber: block.number,
    observedBlockTimestamp: block.timestamp,
    label,
    subject,
    currentOwner: participant.owner,
    currentExpiry: participant.expiry,
    currentResource: participant.resource,
  });
  if (!evidence.ok)
    throw new Error(`Registration evidence failed: ${evidence.error}`);
  const expiry =
    participant.expiry < block.timestamp + 7n * 86_400n
      ? participant.expiry
      : block.timestamp + 7n * 86_400n;
  const credential = makeCredential(trust, subject, evidence.data, expiry);
  const output = {
    blockNumber: block.number,
    credential,
    messageDigest: hashParticipationMessage(credential),
    typedData: getParticipationTypedData(credential),
  };
  process.stdout.write(
    `${JSON.stringify(output, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2)}\n`,
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error &&
    /^(Usage:|Wrong chain|Untrusted parent|ENS deployment|ENS Factory|Participant Resolver|Registration evidence)/.test(
      error.message,
    )
      ? error.message
      : "Unable to read trusted ENS data; inspect the RPC and contract state";
  process.stderr.write(`Participation draft failed: ${message}\n`);
  process.exitCode = 1;
});
