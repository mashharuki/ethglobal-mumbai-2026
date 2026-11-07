import { readFile } from "node:fs/promises";

import { createPublicClient as createArkivClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import {
  type Address,
  bytesToHex,
  createPublicClient,
  decodeFunctionResult,
  encodeFunctionData,
  getAddress,
  http,
  isAddressEqual,
  isHex,
  keccak256,
  namehash,
  parseAbi,
  toHex,
  zeroAddress,
} from "viem";
import { sepolia } from "viem/chains";
import { packetToBytes } from "viem/ens";

import { ensSepoliaDeployment } from "../apps/backend/src/participation/ens-plan.ts";
import {
  type RegistrationEvidenceResult,
  verifyRegistrationEvidence,
} from "../apps/backend/src/participation/issuer.ts";
import { ParticipationPublications } from "../apps/backend/src/participation/publication.ts";
import {
  prepareCredentialReferenceAfterReadback,
  prepareSignedCredentialPublication,
} from "../apps/backend/src/participation/publication-gate.ts";
import {
  getParticipationTypedData,
  hashParticipationMessage,
} from "../packages/shared/src/participation/credential.ts";
import {
  credentialReferenceSchema,
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
const resolverAbi = parseAbi([
  "function resolve(bytes name, bytes data) view returns (bytes)",
]);
const textAbi = parseAbi([
  "function text(bytes32 node, string key) view returns (string)",
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

type Stage = "draft" | "publication" | "reference";

function readArguments() {
  const args = process.argv.slice(2);
  const first = args[0];
  const stage: Stage =
    first === "draft" || first === "publication" || first === "reference"
      ? first
      : "draft";
  const values = stage === first ? args.slice(1) : args;
  const [txHash, label, subject, trustPath, signedPath, entityKey] = values;
  if (
    !txHash ||
    !isHex(txHash, { strict: true }) ||
    txHash.length !== 66 ||
    !label ||
    !subject ||
    !trustPath ||
    (stage !== "draft" && !signedPath) ||
    (stage === "reference" &&
      (!entityKey || !isHex(entityKey) || entityKey.length !== 66))
  ) {
    throw new Error(
      "Usage: node scripts/issue-participation.ts [draft|publication|reference] <registrationTxHash> <label> <subjectAddress> <trust.json> [signed.json] [arkivEntityKey]",
    );
  }
  return { stage, txHash, label, subject, trustPath, signedPath, entityKey };
}

async function readSignedCredential(path: string): Promise<unknown> {
  const value: unknown = JSON.parse(await readFile(path, "utf8"));
  if (typeof value === "object" && value !== null && "credential" in value) {
    return value.credential;
  }
  return value;
}

function printJson(value: unknown): void {
  process.stdout.write(
    `${JSON.stringify(value, (_, item) => (typeof item === "bigint" ? item.toString() : item), 2)}\n`,
  );
}

async function readOptionalReference(
  dnsName: string,
  resolver: Address,
  blockNumber: bigint,
) {
  const profile = encodeFunctionData({
    abi: textAbi,
    functionName: "text",
    args: [namehash(dnsName), "app.credential"],
  });
  const answer = await client.readContract({
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
  if (!value) return null;
  const parsed = credentialReferenceSchema.safeParse(JSON.parse(value));
  if (!parsed.success) throw new Error("REFERENCE_MISMATCH");
  return parsed.data;
}

async function readArkivRow(entityKey: `0x${string}`) {
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: This standalone CLI is not cached by Turbo.
  const accessKey = process.env.ARKIV_ACCESS_KEY ?? "";
  const arkiv = createArkivClient({
    chain: rabdi({ accessKey }),
    transport: http(undefined, { retryCount: 0, timeout: 10_000 }),
  });
  try {
    return await arkiv.getEntity(entityKey, ParticipationPublications);
  } catch {
    throw new Error("ARKIV_UNAVAILABLE");
  }
}

type Arguments = ReturnType<typeof readArguments>;

async function readIssuanceContext(args: Arguments) {
  const trust = await readTrust(args.trustPath);
  const subject = getAddress(args.subject);
  if ((await client.getChainId()) !== trust.chainId)
    throw new Error("Wrong chain");
  const block = await client.getBlock({ blockTag: "latest" });
  const [receipt, participant] = await Promise.all([
    client.getTransactionReceipt({ hash: args.txHash }),
    readParticipant(trust, args.label, block.number),
  ]);
  await verifyParent(trust, block.number, block.timestamp);
  await verifyDeployment(trust, participant.resolver, block.number);
  const evidence = verifyRegistrationEvidence({
    trust,
    receipt,
    observedBlockNumber: block.number,
    observedBlockTimestamp: block.timestamp,
    label: args.label,
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
  return { trust, block, participant, credential };
}

type IssuanceContext = Awaited<ReturnType<typeof readIssuanceContext>>;

async function printPublicationStage(
  context: IssuanceContext,
  signed: unknown,
): Promise<void> {
  const { trust, block, credential } = context;
  const prepared = await prepareSignedCredentialPublication({
    expected: credential,
    signed,
    trust,
    observedAt: block.timestamp,
  });
  if (!prepared.ok) throw new Error(prepared.error);
  const current = await readOptionalReference(
    credential.dnsName,
    context.participant.resolver,
    block.number,
  );
  if (current) throw new Error("ALREADY_ISSUED");
  const { publication } = prepared.data;
  if (!(publication.values.content instanceof Uint8Array))
    throw new Error("INVALID_PUBLICATION");
  printJson({
    blockNumber: block.number,
    arkivWritePlan: {
      schema: "secret_tinder_participation_v1",
      issuanceId: prepared.data.credential.issuanceId,
      credentialVersion: publication.credentialVersion,
      recordDigest: publication.recordDigest,
      contentHex: bytesToHex(publication.values.content),
      expirationDays: 30,
      flags: { readonly: true, permissionlessExtension: false },
    },
  });
}

function isSameReference(
  current: ReturnType<typeof credentialReferenceSchema.parse>,
  proposed: ReturnType<typeof credentialReferenceSchema.parse>,
): boolean {
  return (
    current.schemaVersion === proposed.schemaVersion &&
    current.credentialVersion === proposed.credentialVersion &&
    current.arkivEntityKey.toLowerCase() ===
      proposed.arkivEntityKey.toLowerCase() &&
    current.digest.toLowerCase() === proposed.digest.toLowerCase()
  );
}

async function printReferenceStage(
  args: Arguments,
  context: IssuanceContext,
  signed: unknown,
): Promise<void> {
  const { trust, block, participant, credential } = context;
  const row = await readArkivRow(args.entityKey as `0x${string}`);
  const result = await prepareCredentialReferenceAfterReadback({
    expected: credential,
    signed,
    trust,
    observedAt: block.timestamp,
    row,
    resolver: participant.resolver,
  });
  if (!result.ok) throw new Error(result.error);
  const current = await readOptionalReference(
    credential.dnsName,
    participant.resolver,
    block.number,
  );
  if (current) {
    if (!isSameReference(current, result.data.reference))
      throw new Error("REFERENCE_CONFLICT");
    printJson({
      blockNumber: block.number,
      reference: current,
      alreadyCurrent: true,
    });
    return;
  }
  printJson({
    blockNumber: block.number,
    readbackEntityKey: row.$key,
    ...result.data,
  });
}

async function main(): Promise<void> {
  const args = readArguments();
  const context = await readIssuanceContext(args);
  if (args.stage === "draft") {
    printJson({
      blockNumber: context.block.number,
      credential: context.credential,
      messageDigest: hashParticipationMessage(context.credential),
      typedData: getParticipationTypedData(context.credential),
    });
    return;
  }
  const signed = await readSignedCredential(args.signedPath ?? "");
  if (args.stage === "publication") {
    await printPublicationStage(context, signed);
    return;
  }
  await printReferenceStage(args, context, signed);
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error &&
    /^(Usage:|Wrong chain|Untrusted parent|ENS deployment|ENS Factory|Participant Resolver|Registration evidence|[A-Z_]+$)/.test(
      error.message,
    )
      ? error.message
      : "Unable to read trusted ENS data; inspect the RPC and contract state";
  process.stderr.write(`Participation draft failed: ${message}\n`);
  process.exitCode = 1;
});
