import type { Barretenberg } from "@aztec/bb.js";
import type { Noir } from "@noir-lang/noir_js";
import {
  checkMatchParticipantPublicInputs,
  checkMatchProofContext,
  getMatchSessionDigest,
  type MatchContext,
} from "../../../../packages/shared/src/matching/context.ts";
import matchingBCircuit from "../proofs/matching_b-circuit.json" with {
  type: "json",
};
import matchingResultCircuit from "../proofs/matching_result-circuit.json" with {
  type: "json",
};
import matchingCircuit from "../proofs/matching-circuit.json" with {
  type: "json",
};
import type {
  EncryptedBit,
  FirstProof,
  MatchProof,
  MatchProofEngine,
} from "./match-session.ts";

type CircuitName = "first" | "second" | "result";
type NoirInputs = Parameters<Noir["execute"]>[0];
const circuits = {
  first: matchingCircuit,
  second: matchingBCircuit,
  result: matchingResultCircuit,
} as const;
// Browser BB.js v5.3.0 verification keys for the committed Noir v1.0.0 artifacts.
const vkSha256 = {
  first: "12ea1b68e06613acdcb46abb3d3a6a8caf99f8ea25e44c86629cc32d3a57ea2f",
  second: "4e61e813dc5777c41e087d4ac78eda234caaf68e2f624eee2d5c9277b055cd40",
  result: "6690b2bc2472a4856e47b0a9325b93d8af587550a964527ce7b83408470d9fde",
} as const;
const fieldModulus =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function fieldBytes(value: bigint): Uint8Array {
  if (value < 0n || value >= fieldModulus)
    throw new Error("Invalid field element");
  const hex = value.toString(16).padStart(64, "0");
  return Uint8Array.from(hex.match(/.{2}/g) ?? [], (part) =>
    Number.parseInt(part, 16),
  );
}

function bytesField(value: Uint8Array): bigint {
  return BigInt(
    `0x${Array.from(value, (part) => part.toString(16).padStart(2, "0")).join("")}`,
  );
}

async function hashFields(
  api: Barretenberg,
  fields: readonly bigint[],
): Promise<bigint> {
  const { hash } = await api.pedersenHash({
    inputs: fields.map(fieldBytes),
    hashIndex: 0,
  });
  return bytesField(hash);
}

async function verifiedKey(
  name: CircuitName,
  key: Uint8Array,
): Promise<boolean> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new Uint8Array(key)),
  );
  return (
    Array.from(digest, (part) => part.toString(16).padStart(2, "0")).join(
      "",
    ) === vkSha256[name]
  );
}

async function withBackend<T>(
  name: CircuitName,
  run: (
    api: Barretenberg,
    backend: InstanceType<typeof import("@aztec/bb.js")["UltraHonkBackend"]>,
  ) => Promise<T>,
): Promise<T> {
  const { Barretenberg, UltraHonkBackend } = await import("@aztec/bb.js");
  const api = await Barretenberg.new({
    threads: 1,
    srsSize: name === "result" ? undefined : 2 ** 20,
  });
  try {
    const backend = new UltraHonkBackend(circuits[name].bytecode, api);
    if (!(await verifiedKey(name, await backend.getVerificationKey()))) {
      throw new Error("Matching verification key differs from pinned circuit");
    }
    return await run(api, backend);
  } finally {
    await api.destroy();
  }
}

export async function proveNoirMatchCircuit(
  name: CircuitName,
  inputs: NoirInputs,
): Promise<MatchProof> {
  const { Noir } = await import("@noir-lang/noir_js");
  const noir = new Noir({
    ...circuits[name],
    file_map: {},
    debug_symbols: {},
  } as unknown as ConstructorParameters<typeof Noir>[0]);
  const { witness } = await noir.execute(inputs);
  return withBackend(name, async (_api, backend) => {
    const generated = await backend.generateProof(witness);
    if (!(await backend.verifyProof(generated))) {
      throw new Error("Generated matching proof failed verification");
    }
    return {
      proof: generated.proof,
      publicInputs: generated.publicInputs.map(BigInt),
    };
  });
}

export async function verifyNoirMatchCircuit(
  name: CircuitName,
  proof: MatchProof,
): Promise<boolean> {
  if (
    !(proof.proof instanceof Uint8Array) ||
    proof.proof.length === 0 ||
    proof.publicInputs.some((value) => value < 0n || value >= fieldModulus)
  )
    return false;
  try {
    return await withBackend(name, async (_api, backend) =>
      backend.verifyProof({
        proof: proof.proof,
        publicInputs: proof.publicInputs.map(String),
      }),
    );
  } catch {
    return false;
  }
}

export async function computeMatchCiphertextDigest(
  sessionDigest: bigint,
  publicKeyX: bigint,
  publicKeyY: bigint,
  ciphertexts: readonly EncryptedBit[],
): Promise<bigint | null> {
  if (ciphertexts.length !== 288) return null;
  const { Barretenberg } = await import("@aztec/bb.js");
  const api = await Barretenberg.new({ threads: 1, skipSrsInit: true });
  try {
    let digest = await hashFields(api, [
      9101n,
      sessionDigest,
      publicKeyX,
      publicKeyY,
    ]);
    for (const item of ciphertexts) {
      digest = await hashFields(api, [
        digest,
        item.first.x,
        item.first.y,
        item.second.x,
        item.second.y,
      ]);
    }
    return digest;
  } catch {
    return null;
  } finally {
    await api.destroy();
  }
}

export type MatchWitnessBuilder = {
  first(
    context: MatchContext,
  ): Promise<{ inputs: NoirInputs; ciphertexts: readonly EncryptedBit[] }>;
  second(context: MatchContext, first: FirstProof): Promise<NoirInputs>;
  result(
    context: MatchContext,
    first: FirstProof,
    second: MatchProof,
  ): Promise<NoirInputs>;
};

// The builder receives private profile material in browser memory. It must derive inputs
// for the supplied context; the circuit and all public inputs are checked before release.
export function createNoirMatchProofEngine(
  builder: MatchWitnessBuilder,
): MatchProofEngine {
  const verifyFirst: MatchProofEngine["verifyFirst"] = async (context, first) =>
    checkMatchParticipantPublicInputs(context, "first", first.publicInputs) &&
    (await computeMatchCiphertextDigest(
      getMatchSessionDigest(context),
      BigInt(context.publicKeyX),
      BigInt(context.publicKeyY),
      first.ciphertexts,
    )) === first.publicInputs[11] &&
    verifyNoirMatchCircuit("first", first);
  const verifySecond: MatchProofEngine["verifySecond"] = async (
    context,
    first,
    second,
  ) =>
    (await verifyFirst(context, first)) &&
    checkMatchParticipantPublicInputs(context, "second", second.publicInputs) &&
    second.publicInputs[11] === first.publicInputs[11] &&
    verifyNoirMatchCircuit("second", second);
  const verifyResult: MatchProofEngine["verifyResult"] = async (
    context,
    first,
    second,
    result,
  ) =>
    (await verifySecond(context, first, second)) &&
    checkMatchProofContext(
      context,
      {
        a: first.publicInputs,
        b: second.publicInputs,
        result: result.publicInputs,
      },
      Math.floor(Date.now() / 1000),
    ).ok &&
    verifyNoirMatchCircuit("result", result);
  return {
    async createFirst(context) {
      const witness = await builder.first(context);
      const proof = await proveNoirMatchCircuit("first", witness.inputs);
      const first = { ...proof, ciphertexts: witness.ciphertexts };
      if (!(await verifyFirst(context, first)))
        throw new Error(
          "First matching proof does not bind to context or ciphertexts",
        );
      return first;
    },
    verifyFirst,
    async createSecond(context, first) {
      if (!(await verifyFirst(context, first)))
        throw new Error("Unverified first matching proof");
      const proof = await proveNoirMatchCircuit(
        "second",
        await builder.second(context, first),
      );
      if (!(await verifySecond(context, first, proof)))
        throw new Error("Second matching proof does not bind to context");
      return proof;
    },
    verifySecond,
    async createResult(context, first, second) {
      if (!(await verifySecond(context, first, second)))
        throw new Error("Unverified second matching proof");
      const proof = await proveNoirMatchCircuit(
        "result",
        await builder.result(context, first, second),
      );
      if (!(await verifyResult(context, first, second, proof)))
        throw new Error("Result matching proof does not bind to context");
      return proof;
    },
    verifyResult,
  };
}
