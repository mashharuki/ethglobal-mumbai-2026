import {
  checkMatchProofContext,
  getMatchSessionDigest,
  type MatchContext,
  matchContextSchema,
} from "../../../../packages/shared/src/matching/context.ts";

export type MatchPoint = { x: bigint; y: bigint };
export type EncryptedBit = { first: MatchPoint; second: MatchPoint };
export type MatchProof = {
  proof: Uint8Array;
  publicInputs: readonly bigint[];
};
export type FirstProof = MatchProof & {
  ciphertexts: readonly EncryptedBit[];
};
export type MatchMessage =
  | { kind: "first"; sender: string; sessionDigest: bigint; data: FirstProof }
  | { kind: "second"; sender: string; sessionDigest: bigint; data: MatchProof }
  | { kind: "result"; sender: string; sessionDigest: bigint; data: MatchProof };
export type MatchTransport = {
  send(message: MatchMessage): Promise<void>;
  receive(signal: AbortSignal): Promise<MatchMessage>;
};
export type ReplayGuard = { claim(sessionDigest: bigint): Promise<boolean> };
export type MatchProofEngine = {
  createFirst(context: MatchContext): Promise<FirstProof>;
  verifyFirst(context: MatchContext, proof: FirstProof): Promise<boolean>;
  createSecond(context: MatchContext, first: FirstProof): Promise<MatchProof>;
  verifySecond(
    context: MatchContext,
    first: FirstProof,
    proof: MatchProof,
  ): Promise<boolean>;
  createResult(
    context: MatchContext,
    first: FirstProof,
    second: MatchProof,
  ): Promise<MatchProof>;
  verifyResult(
    context: MatchContext,
    first: FirstProof,
    second: MatchProof,
    proof: MatchProof,
  ): Promise<boolean>;
};
export type MatchSessionResult =
  | { ok: true; data: { compatible: boolean } }
  | {
      ok: false;
      error:
        | "INVALID_CONTEXT"
        | "EXPIRED_LEASE"
        | "REPLAY"
        | "PROOF_INVALID"
        | "TRANSPORT_UNAVAILABLE";
    };

type SessionOptions = {
  context: unknown;
  transport: MatchTransport;
  guard: ReplayGuard;
  proofs: MatchProofEngine;
  nowSeconds: () => number;
  signal: AbortSignal;
};
type Ready = { context: MatchContext; sessionDigest: bigint };

async function prepareSession(
  options: SessionOptions,
): Promise<
  | { ok: true; data: Ready }
  | { ok: false; error: "INVALID_CONTEXT" | "EXPIRED_LEASE" | "REPLAY" }
> {
  const parsed = matchContextSchema.safeParse(options.context);
  if (!parsed.success) return { ok: false, error: "INVALID_CONTEXT" };
  const context = parsed.data;
  if (
    context.first.subjectId.toLowerCase() ===
      context.second.subjectId.toLowerCase() ||
    BigInt(context.first.subjectId) === 0n ||
    BigInt(context.second.subjectId) === 0n ||
    BigInt(context.first.issuanceId) === 0n ||
    BigInt(context.second.issuanceId) === 0n ||
    BigInt(context.first.leaseId) === 0n ||
    BigInt(context.second.leaseId) === 0n ||
    BigInt(context.firstChallenge) === 0n ||
    BigInt(context.secondChallenge) === 0n ||
    (BigInt(context.publicKeyX) === 0n && BigInt(context.publicKeyY) === 0n) ||
    context.firstChallenge.toLowerCase() ===
      context.secondChallenge.toLowerCase()
  )
    return { ok: false, error: "INVALID_CONTEXT" };
  if (
    context.first.leaseExpiresAt <= options.nowSeconds() ||
    context.second.leaseExpiresAt <= options.nowSeconds()
  )
    return { ok: false, error: "EXPIRED_LEASE" };
  const sessionDigest = getMatchSessionDigest(context);
  if (sessionDigest === 0n) return { ok: false, error: "INVALID_CONTEXT" };
  if (!(await options.guard.claim(sessionDigest)))
    return { ok: false, error: "REPLAY" };
  return { ok: true, data: { context, sessionDigest } };
}

function isMessage(
  message: MatchMessage,
  kind: MatchMessage["kind"],
  sender: string,
  sessionDigest: bigint,
): boolean {
  return (
    message.kind === kind &&
    message.sender.toLowerCase() === sender.toLowerCase() &&
    message.sessionDigest === sessionDigest
  );
}

function checkFinalProofs(
  ready: Ready,
  first: FirstProof,
  second: MatchProof,
  result: MatchProof,
  nowSeconds: number,
): MatchSessionResult {
  const checked = checkMatchProofContext(
    ready.context,
    {
      a: first.publicInputs,
      b: second.publicInputs,
      result: result.publicInputs,
    },
    nowSeconds,
  );
  if (!checked.ok)
    return {
      ok: false,
      error:
        checked.error === "EXPIRED_LEASE" ? "EXPIRED_LEASE" : "PROOF_INVALID",
    };
  if (result.publicInputs[9] !== 0n && result.publicInputs[9] !== 1n) {
    return { ok: false, error: "PROOF_INVALID" };
  }
  return { ok: true, data: { compatible: result.publicInputs[9] === 1n } };
}

export async function runFirstClient(
  options: SessionOptions,
): Promise<MatchSessionResult> {
  try {
    const prepared = await prepareSession(options);
    if (!prepared.ok) return prepared;
    const ready = prepared.data;
    const first = await options.proofs.createFirst(ready.context);
    if (
      first.ciphertexts.length !== 288 ||
      !(await options.proofs.verifyFirst(ready.context, first))
    ) {
      return { ok: false, error: "PROOF_INVALID" };
    }
    await options.transport.send({
      kind: "first",
      sender: ready.context.first.subjectId,
      sessionDigest: ready.sessionDigest,
      data: first,
    });
    const received = await options.transport.receive(options.signal);
    if (
      !isMessage(
        received,
        "second",
        ready.context.second.subjectId,
        ready.sessionDigest,
      ) ||
      received.kind !== "second"
    ) {
      return { ok: false, error: "PROOF_INVALID" };
    }
    const second = received.data;
    if (!(await options.proofs.verifySecond(ready.context, first, second)))
      return { ok: false, error: "PROOF_INVALID" };
    const result = await options.proofs.createResult(
      ready.context,
      first,
      second,
    );
    if (
      !(await options.proofs.verifyResult(ready.context, first, second, result))
    )
      return { ok: false, error: "PROOF_INVALID" };
    const verdict = checkFinalProofs(
      ready,
      first,
      second,
      result,
      options.nowSeconds(),
    );
    if (!verdict.ok) return verdict;
    await options.transport.send({
      kind: "result",
      sender: ready.context.first.subjectId,
      sessionDigest: ready.sessionDigest,
      data: result,
    });
    return verdict;
  } catch {
    return { ok: false, error: "TRANSPORT_UNAVAILABLE" };
  }
}

export async function runSecondClient(
  options: SessionOptions,
): Promise<MatchSessionResult> {
  try {
    const prepared = await prepareSession(options);
    if (!prepared.ok) return prepared;
    const ready = prepared.data;
    const received = await options.transport.receive(options.signal);
    if (
      !isMessage(
        received,
        "first",
        ready.context.first.subjectId,
        ready.sessionDigest,
      ) ||
      received.kind !== "first"
    ) {
      return { ok: false, error: "PROOF_INVALID" };
    }
    const first = received.data;
    if (
      first.ciphertexts.length !== 288 ||
      !(await options.proofs.verifyFirst(ready.context, first))
    )
      return { ok: false, error: "PROOF_INVALID" };
    const second = await options.proofs.createSecond(ready.context, first);
    if (!(await options.proofs.verifySecond(ready.context, first, second)))
      return { ok: false, error: "PROOF_INVALID" };
    await options.transport.send({
      kind: "second",
      sender: ready.context.second.subjectId,
      sessionDigest: ready.sessionDigest,
      data: second,
    });
    const final = await options.transport.receive(options.signal);
    if (
      !isMessage(
        final,
        "result",
        ready.context.first.subjectId,
        ready.sessionDigest,
      ) ||
      final.kind !== "result"
    )
      return { ok: false, error: "PROOF_INVALID" };
    if (
      !(await options.proofs.verifyResult(
        ready.context,
        first,
        second,
        final.data,
      ))
    )
      return { ok: false, error: "PROOF_INVALID" };
    return checkFinalProofs(
      ready,
      first,
      second,
      final.data,
      options.nowSeconds(),
    );
  } catch {
    return { ok: false, error: "TRANSPORT_UNAVAILABLE" };
  }
}
