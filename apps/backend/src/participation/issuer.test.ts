import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { participationTrustAnchor, participationTrustSchema } from "shared";
import {
  type Address,
  encodeAbiParameters,
  encodeEventTopics,
  type Hex,
  keccak256,
  parseAbi,
  stringToHex,
  type TransactionReceipt,
  zeroHash,
} from "viem";

import {
  chooseInitialCredentialExpiry,
  verifyRegistrationEvidence,
} from "./issuer.ts";

const registry: Address = "0x1111111111111111111111111111111111111111";
const subject: Address = "0x3333333333333333333333333333333333333333";
const transactionHash = `0x${"a".repeat(64)}` as const;
const trust = participationTrustSchema.parse({
  ...participationTrustAnchor,
  participantRegistry: registry,
  participantRegistryCodeHash: `0x${"b".repeat(64)}`,
  resolverImplementationCodeHash: `0x${"c".repeat(64)}`,
});
const events = parseAbi([
  "event LabelRegistered(uint256 indexed tokenId, bytes32 indexed labelHash, string label, address owner, uint64 expiry, address indexed sender)",
  "event TokenResource(uint256 indexed tokenId, uint256 indexed resource)",
]);

function getTopics(
  value: ReturnType<typeof encodeEventTopics>,
): [Hex, ...Hex[]] {
  const topics = value.filter((item): item is Hex => typeof item === "string");
  const first = topics[0];
  if (!first) throw new Error("Missing event signature");
  return [first, ...topics.slice(1)];
}

function makeReceipt(
  sender: Address = participationTrustAnchor.issuer,
): Pick<
  TransactionReceipt,
  "status" | "transactionHash" | "blockNumber" | "logs"
> {
  const tokenId = 123n;
  const resource = 456n;
  const common = {
    address: registry,
    blockHash: zeroHash,
    blockNumber: 1n,
    removed: false,
    transactionHash,
    transactionIndex: 0,
  };
  return {
    status: "success",
    transactionHash,
    blockNumber: 1n,
    logs: [
      {
        ...common,
        logIndex: 0,
        topics: getTopics(
          encodeEventTopics({
            abi: events,
            eventName: "LabelRegistered",
            args: {
              tokenId,
              labelHash: keccak256(stringToHex("alice")),
              sender,
            },
          }),
        ),
        data: encodeAbiParameters(
          [{ type: "string" }, { type: "address" }, { type: "uint64" }],
          ["alice", subject, 2000n],
        ),
      },
      {
        ...common,
        logIndex: 1,
        topics: getTopics(
          encodeEventTopics({
            abi: events,
            eventName: "TokenResource",
            args: { tokenId, resource },
          }),
        ),
        data: "0x",
      },
    ],
  };
}

function makeEvidence(sender?: Address) {
  return {
    trust,
    receipt: makeReceipt(sender),
    observedBlockNumber: 2n,
    observedBlockTimestamp: 1000n,
    label: "alice",
    subject,
    currentOwner: subject,
    currentExpiry: 2000n,
    currentResource: 456n,
  };
}

describe("ENS issuance receipt", () => {
  it("should keep the initial credential expiry stable across later planning blocks", () => {
    const first = chooseInitialCredentialExpiry(2_000_000n, 1_000n, 2_000n);
    const later = chooseInitialCredentialExpiry(2_000_000n, 1_000n, 3_000n);
    assert.deepEqual(first, { ok: true, data: 605_800 });
    assert.deepEqual(later, first);
  });

  it("should use an earlier name expiry and reject a stale or future registration", () => {
    assert.deepEqual(chooseInitialCredentialExpiry(10_000n, 1_000n, 2_000n), {
      ok: true,
      data: 10_000,
    });
    assert.deepEqual(chooseInitialCredentialExpiry(10_000n, 1_000n, 10_000n), {
      ok: false,
      error: "CREDENTIAL_EXPIRED",
    });
    assert.deepEqual(chooseInitialCredentialExpiry(10_000n, 3_000n, 2_000n), {
      ok: false,
      error: "ISSUANCE_MISMATCH",
    });
  });

  it("should accept a current registration with a stable resource", () => {
    const result = verifyRegistrationEvidence(makeEvidence());
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.dnsName, "alice.secrettinder.eth");
      assert.equal(result.data.resource, 456n);
      assert.equal(result.data.issuanceEvent.logIndex, 0);
    }
  });

  it("should reject a registration from another sender", () => {
    const result = verifyRegistrationEvidence(makeEvidence(subject));
    assert.deepEqual(result, { ok: false, error: "ISSUANCE_MISMATCH" });
  });

  it("should reject a stale registration resource", () => {
    const result = verifyRegistrationEvidence({
      ...makeEvidence(),
      currentResource: 999n,
    });
    assert.deepEqual(result, { ok: false, error: "ISSUANCE_MISMATCH" });
  });

  it("should reject an expired name at the block timestamp", () => {
    const result = verifyRegistrationEvidence({
      ...makeEvidence(),
      observedBlockTimestamp: 2000n,
    });
    assert.deepEqual(result, { ok: false, error: "NAME_EXPIRED" });
  });
});
