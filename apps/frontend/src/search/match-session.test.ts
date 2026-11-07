import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getMatchSessionDigest,
  type MatchContext,
} from "../../../../packages/shared/src/matching/context.ts";
import {
  type MatchMessage,
  type MatchProofEngine,
  type MatchTransport,
  type ReplayGuard,
  runFirstClient,
  runSecondClient,
} from "./match-session.ts";

const id = (number: number): `0x${string}` =>
  `0x${number.toString(16).padStart(64, "0")}`;
function makeContext(): MatchContext {
  return {
    schemaVersion: 1,
    dictionaryVersion: 1,
    chainId: 11155111,
    first: {
      subjectId: id(41),
      issuanceId: id(51),
      credentialVersion: 3,
      profileVersion: 1,
      registrationRoot: id(61),
      leaseId: id(71),
      leaseVersion: 1,
      leaseExpiresAt: 2_000_000_000,
    },
    second: {
      subjectId: id(42),
      issuanceId: id(52),
      credentialVersion: 1,
      profileVersion: 1,
      registrationRoot: id(62),
      leaseId: id(72),
      leaseVersion: 1,
      leaseExpiresAt: 2_000_000_000,
    },
    firstChallenge: id(81),
    secondChallenge: id(82),
    publicKeyX: id(91),
    publicKeyY: id(92),
  };
}

function publicInputs(
  context: MatchContext,
  role: "first" | "second",
): bigint[] {
  const participant = context[role];
  return [
    1n,
    1n,
    BigInt(participant.subjectId),
    0n,
    BigInt(participant.issuanceId),
    0n,
    BigInt(participant.profileVersion),
    BigInt(participant.registrationRoot),
    getMatchSessionDigest(context),
    BigInt(context.publicKeyX),
    BigInt(context.publicKeyY),
    999n,
  ];
}

function proofEngine(): MatchProofEngine {
  return {
    createFirst: async (context) => ({
      proof: new Uint8Array([1]),
      publicInputs: publicInputs(context, "first"),
      ciphertexts: Array.from({ length: 288 }, () => ({
        first: { x: 1n, y: 2n },
        second: { x: 3n, y: 4n },
      })),
    }),
    verifyFirst: async () => true,
    createSecond: async (context) => ({
      proof: new Uint8Array([2]),
      publicInputs: [
        ...publicInputs(context, "second"),
        101n,
        102n,
        103n,
        104n,
      ],
    }),
    verifySecond: async () => true,
    createResult: async (context) => ({
      proof: new Uint8Array([3]),
      publicInputs: [
        getMatchSessionDigest(context),
        999n,
        BigInt(context.publicKeyX),
        BigInt(context.publicKeyY),
        101n,
        102n,
        103n,
        104n,
        0n,
        1n,
      ],
    }),
    verifyResult: async () => true,
  };
}

function replayGuard(): ReplayGuard {
  const seen = new Set<bigint>();
  return {
    claim: async (digest) => {
      if (seen.has(digest)) return false;
      seen.add(digest);
      return true;
    },
  };
}

function transportPair(): readonly [MatchTransport, MatchTransport] {
  const queues: MatchMessage[][] = [[], []];
  const waiting: Array<((message: MatchMessage) => void) | null> = [null, null];
  const endpoint = (side: 0 | 1): MatchTransport => ({
    send: async (message) => {
      const peer = side === 0 ? 1 : 0;
      if (waiting[peer]) {
        const deliver = waiting[peer];
        waiting[peer] = null;
        deliver(message);
      } else queues[peer].push(message);
    },
    receive: async () => {
      const next = queues[side].shift();
      if (next) return next;
      return new Promise((resolve) => {
        waiting[side] = resolve;
      });
    },
  });
  return [endpoint(0), endpoint(1)];
}

describe("two-client match session", () => {
  it("should exchange only proof messages and return one overall bit", async () => {
    const context = makeContext();
    const [firstTransport, secondTransport] = transportPair();
    const common = {
      context,
      proofs: proofEngine(),
      nowSeconds: () => 1_900_000_000,
      signal: new AbortController().signal,
    };
    const [first, second] = await Promise.all([
      runFirstClient({
        ...common,
        transport: firstTransport,
        guard: replayGuard(),
      }),
      runSecondClient({
        ...common,
        transport: secondTransport,
        guard: replayGuard(),
      }),
    ]);
    assert.deepEqual(first, { ok: true, data: { compatible: true } });
    assert.deepEqual(second, first);
  });

  it("should reject reversed roles before accepting an A message", async () => {
    const context = makeContext();
    const reversed = {
      ...context,
      first: context.second,
      second: context.first,
    };
    const message: MatchMessage = {
      kind: "first",
      sender: context.first.subjectId,
      sessionDigest: getMatchSessionDigest(context),
      data: await proofEngine().createFirst(context),
    };
    const transport: MatchTransport = {
      send: async () => {},
      receive: async () => message,
    };
    const result = await runSecondClient({
      context: reversed,
      transport,
      guard: replayGuard(),
      proofs: proofEngine(),
      nowSeconds: () => 1_900_000_000,
      signal: new AbortController().signal,
    });
    assert.deepEqual(result, { ok: false, error: "PROOF_INVALID" });
  });

  it("should reject an old A profile before creating the B proof", async () => {
    const context = makeContext();
    const original = await proofEngine().createFirst(context);
    const message: MatchMessage = {
      kind: "first",
      sender: context.first.subjectId,
      sessionDigest: getMatchSessionDigest(context),
      data: {
        ...original,
        publicInputs: original.publicInputs.map((value, index) =>
          index === 6 ? value + 1n : value,
        ),
      },
    };
    let hasCreatedSecond = false;
    const engine: MatchProofEngine = {
      ...proofEngine(),
      createSecond: async () => {
        hasCreatedSecond = true;
        throw new Error("should not create B proof");
      },
    };
    const result = await runSecondClient({
      context,
      transport: { send: async () => {}, receive: async () => message },
      guard: replayGuard(),
      proofs: engine,
      nowSeconds: () => 1_900_000_000,
      signal: new AbortController().signal,
    });
    assert.deepEqual(result, { ok: false, error: "PROOF_INVALID" });
    assert.equal(hasCreatedSecond, false);
  });

  it("should reject expired leases at their exact deadline", async () => {
    const result = await runFirstClient({
      context: makeContext(),
      transport: transportPair()[0],
      guard: replayGuard(),
      proofs: proofEngine(),
      nowSeconds: () => 2_000_000_000,
      signal: new AbortController().signal,
    });
    assert.deepEqual(result, { ok: false, error: "EXPIRED_LEASE" });
  });

  it("should reject reuse of the same session digest", async () => {
    const context = makeContext();
    const guard = replayGuard();
    const [firstTransport, secondTransport] = transportPair();
    const common = {
      context,
      proofs: proofEngine(),
      nowSeconds: () => 1_900_000_000,
      signal: new AbortController().signal,
    };
    await Promise.all([
      runFirstClient({ ...common, transport: firstTransport, guard }),
      runSecondClient({
        ...common,
        transport: secondTransport,
        guard: replayGuard(),
      }),
    ]);
    const replay = await runFirstClient({
      ...common,
      transport: firstTransport,
      guard,
    });
    assert.deepEqual(replay, { ok: false, error: "REPLAY" });
  });
});
