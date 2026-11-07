import { createPublicClient } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { eq } from "@arkiv-network/sdk/query";
import { participationTrustAnchor } from "shared";
import { http, isAddressEqual } from "viem";

import { ParticipationPublications } from "../src/participation/publication.ts";

const issuanceId = process.argv[2];
if (!issuanceId || !/^0x[0-9a-fA-F]{64}$/.test(issuanceId)) {
  throw new Error("Usage: node scripts/query-publications.ts 0x<issuance-id>");
}
const accessKey = process.env.ARKIV_ACCESS_KEY ?? "";

const client = createPublicClient({
  chain: rabdi({ accessKey }),
  cacheTime: 0,
  transport: http(undefined, { retryCount: 0, timeout: 8_000 }),
});

try {
  const page = await client
    .select({
      $key: true,
      $creator: true,
      $owner: true,
      $expiresAt: true,
      $creationFlags: true,
      issuance_id: true,
      credential_version: true,
      record_digest: true,
    })
    .from(ParticipationPublications, { onMismatch: "throw" })
    .createdBy(participationTrustAnchor.issuer)
    .where(eq("issuance_id", issuanceId))
    .limit(10)
    .fetch();
  const entities = page.entities.map((row) => {
    if (
      !isAddressEqual(row.$creator, participationTrustAnchor.issuer) ||
      !isAddressEqual(row.$owner, participationTrustAnchor.issuer) ||
      !row.$creationFlags.readonly
    ) {
      throw new Error("Published entity has unexpected authority");
    }
    return {
      key: row.$key,
      issuanceId: row.issuance_id.value,
      credentialVersion: row.credential_version.value.toString(),
      recordDigest: row.record_digest.value,
      expiresAt: row.$expiresAt.toString(),
    };
  });
  process.stdout.write(
    `${JSON.stringify({ chainId: 7794095, blockNumber: page.blockNumber.toString(), entities }, null, 2)}\n`,
  );
} catch {
  throw new Error(
    "Arkiv public query failed; check network and indexer availability",
  );
}
