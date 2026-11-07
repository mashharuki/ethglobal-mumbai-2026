import type { Barretenberg, ProofData } from "@aztec/bb.js";
import circuit from "./register-circuit.json" with { type: "json" };

const HOBBIES = ["h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8"] as const;
const GENDERS = ["g1", "g2", "g3"] as const;
const INTENTS = ["i1", "i2"] as const;
const VK_SHA256 =
  "a43ba027d8548eb19f4e45f15d83fa50d293481d751a640aee9d9d9292c239d7";
const MAX_U128 = (1n << 128n) - 1n;
const MAX_SALT = (1n << 248n) - 1n;

export type SyntheticProfile = {
  hobbies: readonly string[];
  gender: string;
  intent: string;
  acceptsGenders: readonly string[];
  acceptsIntents: readonly string[];
  job: number;
  ageBand: number;
};

export type RegistrationRequest = {
  subjectId: string;
  issuanceId: string;
  profileVersion: number;
  profile: SyntheticProfile;
};

export type RegistrationClaim = Pick<
  RegistrationRequest,
  "subjectId" | "issuanceId" | "profileVersion"
> & { root: `0x${string}` };

export type RegistrationProof = ProofData & {
  root: `0x${string}`;
  verificationKey: Uint8Array;
};

export type RegistrationPrivateMaterial = RegistrationRequest & {
  root: `0x${string}`;
  salts: readonly string[];
};

export class RegistrationResult {
  readonly publicProof: RegistrationProof;
  #privateMaterial: RegistrationPrivateMaterial;

  constructor(
    publicProof: RegistrationProof,
    privateMaterial: RegistrationPrivateMaterial,
  ) {
    this.publicProof = publicProof;
    this.#privateMaterial = privateMaterial;
  }

  get privateMaterial(): RegistrationPrivateMaterial {
    return this.#privateMaterial;
  }
}

type FieldLists = {
  hobbies: number[];
  gender: number[];
  intent: number[];
  acceptsGender: number[];
  acceptsIntent: number[];
  job: number;
  ageBand: number;
};

function selectionBits(
  values: readonly string[],
  dictionary: readonly string[],
  wildcard: boolean,
): number[] {
  if (wildcard && values.length === 1 && values[0] === "*") {
    return dictionary.map(() => 1);
  }
  if (values.length === 0 || new Set(values).size !== values.length) {
    throw new Error("Invalid synthetic dictionary selection");
  }
  if (values.some((value) => !dictionary.includes(value))) {
    throw new Error("Value outside synthetic dictionary");
  }
  return dictionary.map((value) => Number(values.includes(value)));
}

function validateProfile(profile: SyntheticProfile): FieldLists {
  if (
    ![201, 202, 203].includes(profile.job) ||
    ![301, 302, 303].includes(profile.ageBand)
  ) {
    throw new Error("Job or age band outside synthetic dictionary");
  }
  return {
    hobbies: selectionBits(profile.hobbies, HOBBIES, false),
    gender: selectionBits([profile.gender], GENDERS, false),
    intent: selectionBits([profile.intent], INTENTS, false),
    acceptsGender: selectionBits(profile.acceptsGenders, GENDERS, true),
    acceptsIntent: selectionBits(profile.acceptsIntents, INTENTS, true),
    job: profile.job,
    ageBand: profile.ageBand,
  };
}

function splitId(id: string): [bigint, bigint] {
  if (!/^0x[0-9a-fA-F]{64}$/.test(id)) {
    throw new Error("Expected a 32-byte hexadecimal identifier");
  }
  const value = BigInt(id);
  if (value === 0n) {
    throw new Error("Identifier must be nonzero");
  }
  return [value & MAX_U128, value >> 128n];
}

function randomSalts(): bigint[] {
  const salts = new Set<bigint>();
  while (salts.size < 7) {
    const bytes = crypto.getRandomValues(new Uint8Array(31));
    const salt = BigInt(
      `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`,
    );
    if (salt !== 0n) salts.add(salt);
    bytes.fill(0);
  }
  return [...salts];
}

function fieldBytes(value: bigint | number): Uint8Array {
  const hex = BigInt(value).toString(16).padStart(64, "0");
  return Uint8Array.from(hex.match(/.{2}/g) ?? [], (byte) =>
    Number.parseInt(byte, 16),
  );
}

async function hashFields(
  api: Barretenberg,
  values: readonly (bigint | number)[],
): Promise<bigint> {
  const result = await api.pedersenHash({
    inputs: values.map(fieldBytes),
    hashIndex: 0,
  });
  const hex = Array.from(result.hash, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return BigInt(`0x${hex}`);
}

async function registrationRoot(
  api: Barretenberg,
  values: FieldLists,
  salts: bigint[],
  context: bigint[],
): Promise<bigint> {
  const items = [
    values.hobbies,
    values.gender,
    values.intent,
    values.acceptsGender,
    values.acceptsIntent,
    [values.job],
    [values.ageBand],
  ];
  const commitments: bigint[] = [];
  for (let index = 0; index < 7; index += 1) {
    const valueHash = await hashFields(api, items[index]);
    commitments.push(
      await hashFields(api, [101 + index, ...context, salts[index], valueHash]),
    );
  }
  return hashFields(api, [9001, ...commitments]);
}

async function sha256Hex(value: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(value));
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function storedRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Invalid private registration material");
  }
  return value as Record<string, unknown>;
}

function storedStrings(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error("Invalid private registration list");
  }
  return [...value];
}

function parseStoredProfile(value: unknown): SyntheticProfile {
  const item = storedRecord(value);
  if (
    typeof item.gender !== "string" ||
    typeof item.intent !== "string" ||
    typeof item.job !== "number" ||
    typeof item.ageBand !== "number"
  ) {
    throw new Error("Invalid private registration fields");
  }
  const profile: SyntheticProfile = {
    hobbies: storedStrings(item.hobbies),
    gender: item.gender,
    intent: item.intent,
    acceptsGenders: storedStrings(item.acceptsGenders),
    acceptsIntents: storedStrings(item.acceptsIntents),
    job: item.job,
    ageBand: item.ageBand,
  };
  validateProfile(profile);
  return profile;
}

function parsePrivateMaterial(value: unknown): RegistrationPrivateMaterial {
  const record = storedRecord(value);
  if (
    typeof record.subjectId !== "string" ||
    typeof record.issuanceId !== "string" ||
    typeof record.profileVersion !== "number" ||
    typeof record.root !== "string"
  ) {
    throw new Error("Invalid private registration fields");
  }
  const profile = parseStoredProfile(record.profile);
  splitId(record.subjectId);
  splitId(record.issuanceId);
  if (
    !Number.isSafeInteger(record.profileVersion) ||
    record.profileVersion < 1
  ) {
    throw new Error("Invalid private registration version");
  }
  if (!/^0x[0-9a-fA-F]{1,64}$/.test(record.root)) {
    throw new Error("Invalid private registration root");
  }
  const salts = storedStrings(record.salts);
  if (
    salts.length !== 7 ||
    salts.some((salt) => !/^[1-9][0-9]*$/.test(salt)) ||
    salts.some((salt) => BigInt(salt) > MAX_SALT) ||
    new Set(salts).size !== salts.length
  ) {
    throw new Error("Invalid private registration salts");
  }
  return {
    subjectId: record.subjectId,
    issuanceId: record.issuanceId,
    profileVersion: record.profileVersion,
    profile,
    root: record.root as `0x${string}`,
    salts,
  };
}

export async function restoreRegistrationPrivateMaterial(
  value: unknown,
): Promise<RegistrationPrivateMaterial> {
  const material = parsePrivateMaterial(value);
  const values = validateProfile(material.profile);
  const [subjectLo, subjectHi] = splitId(material.subjectId);
  const [issuanceLo, issuanceHi] = splitId(material.issuanceId);
  const context = [
    1n,
    1n,
    subjectLo,
    subjectHi,
    issuanceLo,
    issuanceHi,
    BigInt(material.profileVersion),
  ];
  const { Barretenberg } = await import("@aztec/bb.js");
  const api = await Barretenberg.new({ threads: 1, skipSrsInit: true });
  try {
    const root = await registrationRoot(
      api,
      values,
      material.salts.map(BigInt),
      context,
    );
    if (root !== BigInt(material.root)) {
      throw new Error("Private registration root mismatch");
    }
    return material;
  } finally {
    await api.destroy();
  }
}

export async function createRegistrationProof(
  request: RegistrationRequest,
): Promise<RegistrationResult> {
  const values = validateProfile(request.profile);
  const [subjectLo, subjectHi] = splitId(request.subjectId);
  const [issuanceLo, issuanceHi] = splitId(request.issuanceId);
  if (
    !Number.isSafeInteger(request.profileVersion) ||
    request.profileVersion < 1
  ) {
    throw new Error("Profile version must be a positive safe integer");
  }

  const { Barretenberg, UltraHonkBackend } = await import("@aztec/bb.js");
  const { Noir } = await import("@noir-lang/noir_js");
  const api = await Barretenberg.new({ threads: 1 });
  try {
    const salts = randomSalts();
    const context = [
      1n,
      1n,
      subjectLo,
      subjectHi,
      issuanceLo,
      issuanceHi,
      BigInt(request.profileVersion),
    ];
    const root = await registrationRoot(api, values, salts, context);
    const inputs = {
      hobbies: values.hobbies,
      gender: values.gender,
      intent: values.intent,
      accepts_gender: values.acceptsGender,
      accepts_intent: values.acceptsIntent,
      job: values.job,
      age_band: values.ageBand,
      salts: salts.map(String),
      schema_version: 1,
      dictionary_version: 1,
      subject_lo: subjectLo.toString(),
      subject_hi: subjectHi.toString(),
      issuance_lo: issuanceLo.toString(),
      issuance_hi: issuanceHi.toString(),
      profile_version: request.profileVersion,
      root: `0x${root.toString(16)}`,
    };
    const noir = new Noir(circuit as ConstructorParameters<typeof Noir>[0]);
    const { witness } = await noir.execute(inputs);
    const backend = new UltraHonkBackend(circuit.bytecode, api);
    const proof = await backend.generateProof(witness);
    const verificationKey = await backend.getVerificationKey();
    if (
      (await sha256Hex(verificationKey)) !== VK_SHA256 ||
      !(await backend.verifyProof(proof))
    ) {
      throw new Error(
        "Registration proof or pinned verification key is invalid",
      );
    }
    const rootHex = `0x${root.toString(16)}` as const;
    const privateMaterial: RegistrationPrivateMaterial = {
      subjectId: request.subjectId,
      issuanceId: request.issuanceId,
      profileVersion: request.profileVersion,
      profile: {
        hobbies: [...request.profile.hobbies],
        gender: request.profile.gender,
        intent: request.profile.intent,
        acceptsGenders: [...request.profile.acceptsGenders],
        acceptsIntents: [...request.profile.acceptsIntents],
        job: request.profile.job,
        ageBand: request.profile.ageBand,
      },
      root: rootHex,
      salts: salts.map(String),
    };
    return new RegistrationResult(
      { ...proof, root: rootHex, verificationKey },
      privateMaterial,
    );
  } finally {
    await api.destroy();
  }
}

export async function verifyRegistrationProof(
  result: RegistrationProof,
  claim: RegistrationClaim,
): Promise<boolean> {
  if ((await sha256Hex(result.verificationKey)) !== VK_SHA256) return false;
  if (
    !Number.isSafeInteger(claim.profileVersion) ||
    claim.profileVersion < 1 ||
    !/^0x[0-9a-fA-F]{1,64}$/.test(result.root) ||
    !/^0x[0-9a-fA-F]{1,64}$/.test(claim.root) ||
    BigInt(result.root) !== BigInt(claim.root)
  )
    return false;
  const [subjectLo, subjectHi] = splitId(claim.subjectId);
  const [issuanceLo, issuanceHi] = splitId(claim.issuanceId);
  const expected = [
    1n,
    1n,
    subjectLo,
    subjectHi,
    issuanceLo,
    issuanceHi,
    BigInt(claim.profileVersion),
    BigInt(claim.root),
  ];
  if (
    result.publicInputs.length !== expected.length ||
    result.publicInputs.some(
      (value, index) => BigInt(value) !== expected[index],
    )
  )
    return false;
  const { Barretenberg, UltraHonkVerifierBackend } = await import(
    "@aztec/bb.js"
  );
  const api = await Barretenberg.new({ threads: 1 });
  try {
    const verifier = new UltraHonkVerifierBackend(api);
    return await verifier.verifyProof(result);
  } finally {
    await api.destroy();
  }
}
