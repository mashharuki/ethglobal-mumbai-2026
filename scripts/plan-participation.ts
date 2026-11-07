import {
  createPublicClient,
  getAddress,
  http,
  isAddressEqual,
  keccak256,
  parseAbi,
  zeroAddress,
} from "viem";
import { sepolia } from "viem/chains";

import {
  ensSepoliaDeployment,
  planParentRegistry,
  planParticipant,
} from "../apps/backend/src/participation/ens-plan.ts";
import {
  participationTrustAnchor,
  participationTrustSchema,
} from "../packages/shared/src/participation/schema.ts";

const registryAbi = parseAbi([
  "function findTokenId(string label) view returns (uint256)",
  "function getOwner(uint256 anyId) view returns (address)",
  "function getExpiry(uint256 anyId) view returns (uint64)",
  "function getSubregistry(string label) view returns (address)",
  "function hasRoles(uint256 anyId, uint256 roleBitmap, address account) view returns (bool)",
]);
const factoryAbi = parseAbi([
  "function proxyLogic() view returns (address)",
  "function verifyContract(address proxy) view returns (address implementation)",
]);
const client = createPublicClient({
  chain: sepolia,
  transport: http(
    // biome-ignore lint/suspicious/noUndeclaredEnvVars: This standalone CLI is not cached by Turbo.
    process.env.SEPOLIA_RPC_URL ??
      "https://ethereum-sepolia-rpc.publicnode.com",
    {
      retryCount: 2,
      timeout: 15_000,
    },
  ),
});

async function readParent(blockNumber: bigint) {
  const label = participationTrustAnchor.namespace.split(".")[0];
  const tokenId = await client.readContract({
    address: participationTrustAnchor.parentRegistry,
    abi: registryAbi,
    functionName: "findTokenId",
    args: [label],
    blockNumber,
  });
  const [owner, expiry, subregistry, canSetSubregistry] = await Promise.all([
    client.readContract({
      address: participationTrustAnchor.parentRegistry,
      abi: registryAbi,
      functionName: "getOwner",
      args: [tokenId],
      blockNumber,
    }),
    client.readContract({
      address: participationTrustAnchor.parentRegistry,
      abi: registryAbi,
      functionName: "getExpiry",
      args: [tokenId],
      blockNumber,
    }),
    client.readContract({
      address: participationTrustAnchor.parentRegistry,
      abi: registryAbi,
      functionName: "getSubregistry",
      args: [label],
      blockNumber,
    }),
    client.readContract({
      address: participationTrustAnchor.parentRegistry,
      abi: registryAbi,
      functionName: "hasRoles",
      args: [tokenId, 1n << 20n, participationTrustAnchor.issuer],
      blockNumber,
    }),
  ]);
  return { tokenId, owner, expiry, subregistry, canSetSubregistry };
}

async function readFactory(blockNumber: bigint) {
  const [proxyLogic, factoryCode, registryCode, resolverCode] =
    await Promise.all([
      client.readContract({
        address: ensSepoliaDeployment.factory,
        abi: factoryAbi,
        functionName: "proxyLogic",
        blockNumber,
      }),
      client.getCode({ address: ensSepoliaDeployment.factory, blockNumber }),
      client.getCode({
        address: ensSepoliaDeployment.userRegistryImplementation,
        blockNumber,
      }),
      client.getCode({
        address: ensSepoliaDeployment.resolverImplementation,
        blockNumber,
      }),
    ]);
  if (
    !factoryCode ||
    factoryCode === "0x" ||
    !registryCode ||
    registryCode === "0x"
  ) {
    throw new Error("Missing ENS factory or UserRegistry implementation code");
  }
  if (!resolverCode || resolverCode === "0x") {
    throw new Error("Missing ENS PermissionedResolver implementation code");
  }
  return {
    proxyLogic,
    factoryCodeHash: keccak256(factoryCode),
    registryImplementationCodeHash: keccak256(registryCode),
    resolverImplementationCodeHash: keccak256(resolverCode),
  };
}

async function main(): Promise<void> {
  const [mode, label, subjectValue] = process.argv.slice(2);
  if (
    mode !== "parent" &&
    mode !== "participant" &&
    mode !== "participant-preview"
  ) {
    throw new Error(
      "Usage: node scripts/plan-participation.ts parent | participant <label> <subjectAddress> | participant-preview <label> <subjectAddress>",
    );
  }
  if ((await client.getChainId()) !== participationTrustAnchor.chainId) {
    throw new Error("Wrong ENS chain");
  }
  const block = await client.getBlock({ blockTag: "latest" });
  const [parent, factory] = await Promise.all([
    readParent(block.number),
    readFactory(block.number),
  ]);
  if (
    !isAddressEqual(parent.owner, participationTrustAnchor.issuer) ||
    parent.expiry <= block.timestamp ||
    !parent.canSetSubregistry
  ) {
    throw new Error("Parent name owner or expiry changed");
  }
  const base = { blockNumber: block.number, parent, factory };
  if (mode === "parent") {
    const plan = planParentRegistry(factory.proxyLogic, parent.tokenId);
    if (
      parent.subregistry !== zeroAddress &&
      !isAddressEqual(parent.subregistry, plan.registry)
    ) {
      throw new Error("Parent is connected to an unexpected Registry");
    }
    const predictedCode = await client.getCode({
      address: plan.registry,
      blockNumber: block.number,
    });
    const isPredictedRegistryDeployed =
      !!predictedCode && predictedCode !== "0x";
    const deployedImplementation = isPredictedRegistryDeployed
      ? await client.readContract({
          address: ensSepoliaDeployment.factory,
          abi: factoryAbi,
          functionName: "verifyContract",
          args: [plan.registry],
          blockNumber: block.number,
        })
      : null;
    const isFactoryVerified = deployedImplementation
      ? isAddressEqual(
          deployedImplementation,
          ensSepoliaDeployment.userRegistryImplementation,
        )
      : false;
    const isParentConnected = isAddressEqual(parent.subregistry, plan.registry);
    const trust =
      isParentConnected && isFactoryVerified && predictedCode
        ? participationTrustSchema.parse({
            ...participationTrustAnchor,
            participantRegistry: plan.registry,
            participantRegistryCodeHash: keccak256(predictedCode),
            resolverImplementationCodeHash:
              factory.resolverImplementationCodeHash,
          })
        : null;
    const result = {
      ...base,
      predictedRegistry: plan.registry,
      isPredictedRegistryDeployed,
      deployedRegistryCodeHash: isPredictedRegistryDeployed
        ? keccak256(predictedCode)
        : null,
      deployedImplementation,
      isFactoryVerified,
      isParentConnected,
      trust,
      connectedRegistry: parent.subregistry,
      plan:
        parent.subregistry === zeroAddress
          ? {
              ...plan,
              deploy: isPredictedRegistryDeployed ? null : plan.deploy,
            }
          : null,
    };
    process.stdout.write(
      `${JSON.stringify(result, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2)}\n`,
    );
    return;
  }
  if (!label || !subjectValue)
    throw new Error("Participant label and public address required");
  if (mode === "participant" && parent.subregistry === zeroAddress)
    throw new Error("Parent has no participant Registry yet");
  const predictedRegistry = planParentRegistry(
    factory.proxyLogic,
    parent.tokenId,
  ).registry;
  if (
    parent.subregistry !== zeroAddress &&
    !isAddressEqual(parent.subregistry, predictedRegistry)
  ) {
    throw new Error("Parent is connected to an unexpected Registry");
  }
  const registry =
    parent.subregistry === zeroAddress ? predictedRegistry : parent.subregistry;
  const registryCode = await client.getCode({
    address: registry,
    blockNumber: block.number,
  });
  const hasRegistryCode = !!registryCode && registryCode !== "0x";
  if (mode === "participant" && !hasRegistryCode)
    throw new Error("Connected Registry has no code");
  const expiry =
    block.timestamp + 7n * 86400n < parent.expiry
      ? block.timestamp + 7n * 86400n
      : parent.expiry;
  const plan = planParticipant({
    proxyLogic: factory.proxyLogic,
    registry,
    label,
    subject: getAddress(subjectValue),
    expiry,
  });
  const result = {
    ...base,
    predictedRegistry,
    isParentConnected: parent.subregistry !== zeroAddress,
    hasRegistryCode,
    registryCodeHash: hasRegistryCode ? keccak256(registryCode) : null,
    plan,
  };
  process.stdout.write(
    `${JSON.stringify(result, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2)}\n`,
  );
}

main().catch((error: unknown) => {
  const reason =
    error instanceof Error &&
    /^(Usage:|Wrong ENS chain|Parent name|Participant label|Parent has|Connected Registry|Parent is connected|Invalid participant label|Invalid expiry|Issuer cannot)/.test(
      error.message,
    )
      ? error.message
      : error instanceof Error
        ? error.name
        : "Unknown failure";
  process.stderr.write(
    `ENS plan failed (${reason}). Check the network and public parent/registry state.\n`,
  );
  process.exitCode = 1;
});
