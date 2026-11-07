import { readFile, writeFile } from "node:fs/promises";

import { createPublicClient, ENTITY_EVENTS_ABI } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { participationTrustSchema } from "shared";
import { decodeEventLog, type Hex, http, isAddressEqual } from "viem";

import {
  createCredentialReference,
  ParticipationPublications,
  prepareParticipationPublication,
  verifyPublicationReadback,
} from "../src/participation/publication.ts";

const evidenceDir = "../../specs/001-private-dating/evidence";
const arkivAddress = "0x4400000000000000000000000000000000000044";
const client = createPublicClient({
  chain: rabdi({ accessKey: "" }),
  transport: http(undefined, { retryCount: 0, timeout: 10_000 }),
});

type PublicationPlan = {
  chainId: number;
  issuer: `0x${string}`;
  gasPriceWei: string;
  entries: Array<{
    participant: string;
    expectedNonce: number;
    gasLimit: string;
    data: Hex;
    to: `0x${string}`;
    recordDigest: Hex;
  }>;
};

async function loadJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

async function loadPlan(): Promise<PublicationPlan> {
  const value = await loadJson(`${evidenceDir}/arkiv-participation-plan.json`);
  if (
    !value ||
    typeof value !== "object" ||
    !("chainId" in value) ||
    value.chainId !== 7794095 ||
    !("entries" in value) ||
    !Array.isArray(value.entries)
  ) {
    throw new Error("Invalid publication plan");
  }
  return value as PublicationPlan;
}

async function saveEvidence(name: string, value: unknown): Promise<void> {
  await writeFile(
    `${evidenceDir}/arkiv-${name}-publication.json`,
    `${JSON.stringify(value, null, 2)}\n`,
  );
}

function getCreatedEvent(
  receipt: Awaited<ReturnType<typeof client.getTransactionReceipt>>,
) {
  const matching = receipt.logs.filter((log) =>
    isAddressEqual(log.address, arkivAddress),
  );
  const created = matching.flatMap((log) => {
    try {
      const event = decodeEventLog({
        abi: ENTITY_EVENTS_ABI,
        data: log.data,
        topics: log.topics,
      });
      return event.eventName === "EntityCreated" ? [event.args] : [];
    } catch {
      return [];
    }
  });
  if (created.length !== 1) throw new Error("Expected one EntityCreated event");
  return created[0];
}

async function verifyTransaction(name: string, hash: Hex) {
  const plan = await loadPlan();
  const entry = plan.entries.find((item) => item.participant === name);
  if (!entry || plan.chainId !== 7794095) throw new Error("Plan mismatch");
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
    receipt.effectiveGasPrice > BigInt(plan.gasPriceWei)
  ) {
    throw new Error("Transaction differs from approved plan");
  }
  const block = await client.getBlock({ blockNumber: receipt.blockNumber });
  if (block.hash !== receipt.blockHash)
    throw new Error("Receipt is not in the canonical block");
  return { plan, entry, receipt, created: getCreatedEvent(receipt) };
}

function buildReceiptEvidence(
  name: string,
  hash: Hex,
  transaction: Awaited<ReturnType<typeof verifyTransaction>>,
) {
  const { plan, entry, receipt, created } = transaction;
  return {
    status: "receipt_confirmed",
    participant: name,
    chainId: plan.chainId,
    issuer: plan.issuer,
    txHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    blockHash: receipt.blockHash,
    gasUsed: receipt.gasUsed.toString(),
    effectiveGasPrice: receipt.effectiveGasPrice.toString(),
    entityKey: created.entityKey,
    entityExpiresAtBlock: created.expiresAt.toString(),
    recordDigest: entry.recordDigest,
  };
}

async function verifyEntityReadback(
  name: string,
  transaction: Awaited<ReturnType<typeof verifyTransaction>>,
) {
  const { plan, entry, created } = transaction;
  const trust = participationTrustSchema.parse(
    await loadJson(`${evidenceDir}/ens-trust.json`),
  );
  const signed = (await loadJson(
    `${evidenceDir}/ens-${name}-credential-signed.json`,
  )) as { credential: unknown };
  const block = await client.getBlock();
  const prepared = await prepareParticipationPublication(
    signed.credential,
    trust,
    block.timestamp,
  );
  if (!prepared.ok || prepared.data.recordDigest !== entry.recordDigest)
    throw new Error("Signed credential no longer matches the plan");
  const reference = createCredentialReference(created.entityKey, prepared.data);
  const row = await client.getEntity(
    created.entityKey,
    ParticipationPublications,
  );
  if (
    !isAddressEqual(row.$creator, plan.issuer) ||
    row.$expiresAt !== created.expiresAt ||
    !row.$creationFlags.readonly ||
    row.$creationFlags.permissionlessExtension
  ) {
    throw new Error("Arkiv entity metadata mismatch");
  }
  const readback = await verifyPublicationReadback(
    row,
    reference,
    trust,
    block.timestamp,
  );
  if (!readback.ok) throw new Error(`Arkiv readback: ${readback.error}`);
  return reference;
}

async function verifyPublication(name: string, hash: Hex): Promise<void> {
  const transaction = await verifyTransaction(name, hash);
  const { plan, created } = transaction;
  if (
    !isAddressEqual(created.owner, plan.issuer) ||
    created.creationFlags !== 1
  )
    throw new Error("Created entity metadata mismatch");
  const receiptEvidence = buildReceiptEvidence(name, hash, transaction);
  await saveEvidence(name, receiptEvidence);
  const reference = await verifyEntityReadback(name, transaction);
  await saveEvidence(name, {
    ...receiptEvidence,
    status: "verified",
    reference,
  });
  process.stdout.write(`${name}: verified ${hash} ${created.entityKey}\n`);
}

const [name, hash] = process.argv.slice(2);
if (
  (name !== "alice" && name !== "bob") ||
  !hash ||
  !/^0x[0-9a-fA-F]{64}$/.test(hash)
) {
  throw new Error(
    "Usage: node scripts/verify-publication.ts alice|bob 0x<tx-hash>",
  );
}
await verifyPublication(name, hash as Hex);
