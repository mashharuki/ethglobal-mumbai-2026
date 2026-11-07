import { readFile } from "node:fs/promises";

import { createPublicClient as createArkivClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { bytesToHex, http, isHex } from "viem";
import { normalize } from "viem/ens";

import { ParticipationPublications } from "../apps/backend/src/participation/publication.ts";
import { prepareParticipationRevision } from "../apps/backend/src/participation/revision.ts";
import {
  prepareRevisionReferenceAfterReadback,
  prepareSignedRevisionPublication,
} from "../apps/backend/src/participation/revision-flow.ts";
import {
  getParticipationTypedData,
  hashParticipationMessage,
} from "../packages/shared/src/participation/credential.ts";
import {
  checkCredential,
  checkIssuance,
  readCurrentRecords,
} from "./verify-participation.ts";

type Request = {
  label: string;
  action: { type: "suspend"; until: number } | { type: "restore" };
  signedRevisionPath?: string;
  arkivEntityKey?: `0x${string}`;
};

function parseRequest(value: unknown): Request {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid request");
  const data = value as Record<string, unknown>;
  if (
    typeof data.label !== "string" ||
    !/^[a-z0-9-]+$/.test(data.label) ||
    normalize(data.label) !== data.label
  ) {
    throw new Error("Invalid participant label");
  }
  if (typeof data.action !== "object" || data.action === null) {
    throw new Error("Invalid action");
  }
  const action = data.action as Record<string, unknown>;
  if (
    action.type !== "restore" &&
    (action.type !== "suspend" ||
      typeof action.until !== "number" ||
      !Number.isSafeInteger(action.until))
  ) {
    throw new Error("Invalid action");
  }
  if (
    data.signedRevisionPath !== undefined &&
    typeof data.signedRevisionPath !== "string"
  ) {
    throw new Error("Invalid signed revision path");
  }
  if (
    data.arkivEntityKey !== undefined &&
    (typeof data.arkivEntityKey !== "string" ||
      !isHex(data.arkivEntityKey, { strict: true }) ||
      data.arkivEntityKey.length !== 66)
  ) {
    throw new Error("Invalid Arkiv entity key");
  }
  return {
    label: data.label,
    action:
      action.type === "restore"
        ? { type: "restore" }
        : { type: "suspend", until: action.until as number },
    signedRevisionPath: data.signedRevisionPath as string | undefined,
    arkivEntityKey: data.arkivEntityKey as `0x${string}` | undefined,
  };
}

async function readCurrentInput(request: Request) {
  const current = await readCurrentRecords(request.label);
  const { credential, reference, trust, name, dnsName, issuanceId, block } =
    current;
  await checkCredential(
    credential,
    issuanceId,
    reference,
    trust,
    name.owner,
    dnsName,
  );
  try {
    await checkIssuance(
      credential,
      request.label,
      trust,
      name.resource,
      block.number,
    );
  } catch (error) {
    if (error instanceof Error && "code" in error) throw error;
    throw new Error("ENS_UNAVAILABLE");
  }
  return {
    current,
    revision: {
      previous: credential,
      currentReference: reference,
      trust,
      currentOwner: name.owner,
      currentIssuanceId: credential.issuanceId,
      observedAt: block.timestamp,
      action: request.action,
    },
  };
}

async function readSignedRevision(request: Request): Promise<unknown> {
  if (!request.signedRevisionPath)
    throw new Error("Signed revision file is required");
  const value: unknown = JSON.parse(
    await readFile(request.signedRevisionPath, "utf8"),
  );
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

type CurrentInput = Awaited<ReturnType<typeof readCurrentInput>>;
type PreparedRevision = Extract<
  Awaited<ReturnType<typeof prepareSignedRevisionPublication>>,
  { ok: true }
>["data"];

function makeContext(current: CurrentInput["current"]) {
  return {
    observedEnsBlock: current.block.number,
    currentCredentialVersion: current.reference.credentialVersion,
    currentReference: current.reference,
    dnsName: current.dnsName,
  };
}

async function printDraftPlan(input: CurrentInput): Promise<void> {
  const result = await prepareParticipationRevision(input.revision);
  if (!result.ok) throw new Error(result.error);
  printJson({
    ...makeContext(input.current),
    draft: result.data,
    messageDigest: hashParticipationMessage(result.data),
    typedData: getParticipationTypedData(result.data),
  });
}

function printPublicationPlan(
  current: CurrentInput["current"],
  prepared: PreparedRevision,
): void {
  const { publication } = prepared;
  if (!(publication.values.content instanceof Uint8Array)) {
    throw new Error("INVALID_PUBLICATION");
  }
  printJson({
    ...makeContext(current),
    arkivWritePlan: {
      schema: "secret_tinder_participation_v1",
      issuanceId: prepared.credential.issuanceId,
      credentialVersion: publication.credentialVersion,
      recordDigest: publication.recordDigest,
      contentHex: bytesToHex(publication.values.content),
      expirationDays: 30,
      flags: { readonly: true, permissionlessExtension: false },
    },
  });
}

async function printReferencePlan(
  request: Request,
  input: CurrentInput,
  signedRevision: unknown,
): Promise<void> {
  if (!request.arkivEntityKey) throw new Error("Arkiv entity key is required");
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: This standalone CLI is not cached by Turbo.
  const accessKey = process.env.ARKIV_ACCESS_KEY ?? "";
  const arkiv = createArkivClient({
    chain: rabdi({ accessKey }),
    transport: http(undefined, { retryCount: 0, timeout: 10_000 }),
  });
  let row: Awaited<
    ReturnType<typeof arkiv.getEntity<typeof ParticipationPublications>>
  >;
  try {
    row = await arkiv.getEntity(
      request.arkivEntityKey,
      ParticipationPublications,
    );
  } catch {
    throw new Error("ARKIV_UNAVAILABLE");
  }
  const result = await prepareRevisionReferenceAfterReadback({
    ...input.revision,
    signedRevision,
    row,
    resolver: input.current.name.resolver,
  });
  if (!result.ok) throw new Error(result.error);
  printJson({
    ...makeContext(input.current),
    readbackEntityKey: row.$key,
    ...result.data,
  });
}

async function main(): Promise<void> {
  const stage = process.argv[2];
  const requestPath = process.argv[3];
  if (
    !requestPath ||
    !["draft", "publication", "reference"].includes(stage ?? "")
  ) {
    throw new Error(
      "Usage: node scripts/plan-participation-revision.ts <draft|publication|reference> <request.json>",
    );
  }
  const request = parseRequest(JSON.parse(await readFile(requestPath, "utf8")));
  const input = await readCurrentInput(request);
  if (stage === "draft") {
    await printDraftPlan(input);
    return;
  }
  const signedRevision = await readSignedRevision(request);
  const prepared = await prepareSignedRevisionPublication({
    ...input.revision,
    signedRevision,
  });
  if (!prepared.ok) throw new Error(prepared.error);
  if (stage === "publication") {
    printPublicationPlan(input.current, prepared.data);
    return;
  }
  await printReferencePlan(request, input, signedRevision);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown failure";
    const reason =
      error instanceof Error &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : message;
    const verdict = reason.endsWith("_UNAVAILABLE")
      ? "unavailable"
      : "ineligible";
    process.stdout.write(`${JSON.stringify({ verdict, reason })}\n`);
    process.exitCode = 1;
  });
}
