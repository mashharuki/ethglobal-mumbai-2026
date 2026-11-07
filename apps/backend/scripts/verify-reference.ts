import { readFile, writeFile } from "node:fs/promises";

import { credentialReferenceSchema, participationTrustSchema } from "shared";
import {
  createPublicClient,
  decodeFunctionResult,
  encodeFunctionData,
  type Hex,
  http,
  isAddressEqual,
  namehash,
  parseAbi,
  toHex,
} from "viem";
import { sepolia } from "viem/chains";
import { normalize, packetToBytes } from "viem/ens";

const evidenceDir = "../../specs/001-private-dating/evidence";
const client = createPublicClient({
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com", {
    retryCount: 0,
    timeout: 10_000,
  }),
});
const resolverAbi = parseAbi([
  "function resolve(bytes name, bytes data) view returns (bytes)",
]);
const textAbi = parseAbi([
  "function text(bytes32 node, string key) view returns (string)",
]);
const registryAbi = parseAbi([
  "function findTokenId(string label) view returns (uint256)",
  "function getOwner(uint256 anyId) view returns (address)",
  "function getExpiry(uint256 anyId) view returns (uint64)",
  "function getResolver(string label) view returns (address)",
  "function getSubregistry(string label) view returns (address)",
]);
const factoryAbi = parseAbi([
  "function verifyContract(address proxy) view returns (address implementation)",
]);

async function loadJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function saveEvidence(name: string, value: unknown): Promise<void> {
  await writeFile(
    `${evidenceDir}/ens-${name}-reference.json`,
    `${JSON.stringify(value, null, 2)}\n`,
  );
}

async function verifyTransaction(name: string, hash: Hex) {
  const plan = (await loadJson(`${evidenceDir}/ens-reference-plan.json`)) as {
    chainId: number;
    issuer: `0x${string}`;
    entries: Array<{
      participant: string;
      dnsName: string;
      resolver: `0x${string}`;
      expectedNonce: number;
      gasLimit: string;
      gasPriceWei: string;
      to: `0x${string}`;
      data: Hex;
      reference: unknown;
    }>;
  };
  const entry = plan.entries.find((item) => item.participant === name);
  if (!entry || plan.chainId !== 11155111) throw new Error("Plan mismatch");
  const [transaction, receipt] = await Promise.all([
    client.getTransaction({ hash }),
    client.getTransactionReceipt({ hash }),
  ]);
  if (
    !isAddressEqual(transaction.from, plan.issuer) ||
    !transaction.to ||
    !isAddressEqual(transaction.to, entry.to) ||
    transaction.input.toLowerCase() !== entry.data.toLowerCase() ||
    transaction.value !== 0n ||
    transaction.nonce !== entry.expectedNonce ||
    transaction.gas > BigInt(entry.gasLimit) ||
    receipt.status !== "success" ||
    receipt.effectiveGasPrice > BigInt(entry.gasPriceWei)
  ) {
    throw new Error("Transaction differs from approved plan");
  }
  const block = await client.getBlock({ blockNumber: receipt.blockNumber });
  if (block.hash !== receipt.blockHash)
    throw new Error("Receipt is not in the canonical block");
  return { plan, entry, receipt };
}

async function readText(
  resolver: `0x${string}`,
  dnsName: string,
  blockNumber: bigint,
): Promise<string> {
  const name = normalize(dnsName);
  const profile = encodeFunctionData({
    abi: textAbi,
    functionName: "text",
    args: [namehash(name), "app.credential"],
  });
  const encoded = await client.readContract({
    address: resolver,
    abi: resolverAbi,
    functionName: "resolve",
    args: [toHex(packetToBytes(name)), profile],
    blockNumber,
  });
  return decodeFunctionResult({
    abi: textAbi,
    functionName: "text",
    data: encoded,
  });
}

async function readCurrentState(
  name: string,
  entry: Awaited<ReturnType<typeof verifyTransaction>>["entry"],
  trust: ReturnType<typeof participationTrustSchema.parse>,
) {
  const block = await client.getBlock();
  const blockNumber = block.number;
  const tokenId = await client.readContract({
    address: trust.participantRegistry,
    abi: registryAbi,
    functionName: "findTokenId",
    args: [name],
    blockNumber,
  });
  const [parent, owner, expiry, resolver, implementation, value] =
    await Promise.all([
      client.readContract({
        address: trust.parentRegistry,
        abi: registryAbi,
        functionName: "getSubregistry",
        args: ["secrettinder"],
        blockNumber,
      }),
      client.readContract({
        address: trust.participantRegistry,
        abi: registryAbi,
        functionName: "getOwner",
        args: [tokenId],
        blockNumber,
      }),
      client.readContract({
        address: trust.participantRegistry,
        abi: registryAbi,
        functionName: "getExpiry",
        args: [tokenId],
        blockNumber,
      }),
      client.readContract({
        address: trust.participantRegistry,
        abi: registryAbi,
        functionName: "getResolver",
        args: [name],
        blockNumber,
      }),
      client.readContract({
        address: "0xDa70306C98E97eCe36F997a21368e53298572991",
        abi: factoryAbi,
        functionName: "verifyContract",
        args: [entry.resolver],
        blockNumber,
      }),
      readText(entry.resolver, entry.dnsName, blockNumber),
    ]);
  return { block, parent, owner, expiry, resolver, implementation, value };
}

async function verifyCurrentReference(
  name: string,
  entry: Awaited<ReturnType<typeof verifyTransaction>>["entry"],
) {
  const trust = participationTrustSchema.parse(
    await loadJson(`${evidenceDir}/ens-trust.json`),
  );
  const signed = (await loadJson(
    `${evidenceDir}/ens-${name}-credential-signed.json`,
  )) as { credential: { subject: `0x${string}` } };
  const arkiv = (await loadJson(
    `${evidenceDir}/arkiv-${name}-publication.json`,
  )) as { status: string; reference: unknown };
  const { block, parent, owner, expiry, resolver, implementation, value } =
    await readCurrentState(name, entry, trust);
  const reference = credentialReferenceSchema.parse(JSON.parse(value));
  if (
    arkiv.status !== "verified" ||
    JSON.stringify(arkiv.reference) !== JSON.stringify(entry.reference) ||
    !isAddressEqual(parent, trust.participantRegistry) ||
    !isAddressEqual(owner, signed.credential.subject) ||
    expiry <= block.timestamp ||
    !isAddressEqual(resolver, entry.resolver) ||
    !isAddressEqual(
      implementation,
      "0x115eb53f0c60696633855f90b138178fb40b2b2c",
    ) ||
    JSON.stringify(reference) !== JSON.stringify(entry.reference)
  ) {
    throw new Error("ENS reference or hierarchy mismatch");
  }
  return { blockNumber: block.number.toString(), reference };
}

async function verifyReference(name: string, hash: Hex): Promise<void> {
  const { entry, receipt } = await verifyTransaction(name, hash);
  const evidence = {
    status: "receipt_confirmed",
    participant: name,
    txHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    blockHash: receipt.blockHash,
    gasUsed: receipt.gasUsed.toString(),
    effectiveGasPrice: receipt.effectiveGasPrice.toString(),
  };
  await saveEvidence(name, evidence);
  const current = await verifyCurrentReference(name, entry);
  await saveEvidence(name, { ...evidence, status: "verified", ...current });
  process.stdout.write(`${name}: ENS reference verified ${hash}\n`);
}

const [name, hash] = process.argv.slice(2);
if (
  (name !== "alice" && name !== "bob") ||
  !hash ||
  !/^0x[0-9a-fA-F]{64}$/.test(hash)
) {
  throw new Error("Usage: node scripts/verify-reference.ts alice|bob 0x<hash>");
}
await verifyReference(name, hash as Hex);
