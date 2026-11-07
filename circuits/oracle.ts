export type SyntheticDictionary = {
  hobbies: readonly string[];
  genders: readonly string[];
  intents: readonly string[];
};

export type SyntheticProfile = {
  hobbies: readonly string[];
  gender: string;
  intent: string;
  acceptsGenders: readonly string[];
  acceptsIntents: readonly string[];
};

type OracleError =
  | "INVALID_DICTIONARY"
  | "INVALID_PROFILE"
  | "INVALID_VECTOR_LENGTH";

type OracleResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: OracleError };

function hasUniqueValues(values: readonly string[]): boolean {
  return values.length > 0 && new Set(values).size === values.length;
}

function isValidSelection(
  selected: readonly string[],
  allowed: readonly string[],
  shouldAllowWildcard: boolean,
): boolean {
  if (selected.length === 0 || new Set(selected).size !== selected.length) {
    return false;
  }
  if (shouldAllowWildcard && selected.length === 1 && selected[0] === "*") {
    return true;
  }
  return selected.every((value) => allowed.includes(value));
}

function isValidProfile(
  profile: SyntheticProfile,
  dictionary: SyntheticDictionary,
): boolean {
  return (
    isValidSelection(profile.hobbies, dictionary.hobbies, false) &&
    dictionary.genders.includes(profile.gender) &&
    dictionary.intents.includes(profile.intent) &&
    isValidSelection(profile.acceptsGenders, dictionary.genders, true) &&
    isValidSelection(profile.acceptsIntents, dictionary.intents, true)
  );
}

function acceptsValue(preferences: readonly string[], value: string): boolean {
  return preferences[0] === "*" || preferences.includes(value);
}

function getCoordinates(
  index: number,
  dictionary: SyntheticDictionary,
): [number, number, number, number, number] {
  const intentCount = dictionary.intents.length;
  const genderCount = dictionary.genders.length;
  const intentB = index % intentCount;
  const intentA = Math.floor(index / intentCount) % intentCount;
  const genderB = Math.floor(index / intentCount ** 2) % genderCount;
  const genderA =
    Math.floor(index / (intentCount ** 2 * genderCount)) % genderCount;
  const hobby = Math.floor(index / (intentCount ** 2 * genderCount ** 2));
  return [hobby, genderA, genderB, intentA, intentB];
}

function isActiveCoordinate(
  profile: SyntheticProfile,
  role: "A" | "B",
  dictionary: SyntheticDictionary,
  index: number,
): boolean {
  const [hobby, genderA, genderB, intentA, intentB] = getCoordinates(
    index,
    dictionary,
  );
  return (
    profile.hobbies.includes(dictionary.hobbies[hobby]) &&
    profile.gender === dictionary.genders[role === "A" ? genderA : genderB] &&
    profile.intent === dictionary.intents[role === "A" ? intentA : intentB] &&
    acceptsValue(
      profile.acceptsGenders,
      dictionary.genders[role === "A" ? genderB : genderA],
    ) &&
    acceptsValue(
      profile.acceptsIntents,
      dictionary.intents[role === "A" ? intentB : intentA],
    )
  );
}

export function getCoordinateCount(dictionary: SyntheticDictionary): number {
  return (
    dictionary.hobbies.length *
    dictionary.genders.length *
    dictionary.genders.length *
    dictionary.intents.length *
    dictionary.intents.length
  );
}

export function getCoordinateIndex(
  dictionary: SyntheticDictionary,
  hobby: number,
  genderA: number,
  genderB: number,
  intentA: number,
  intentB: number,
): number {
  const genderCount = dictionary.genders.length;
  const intentCount = dictionary.intents.length;
  return (
    (((hobby * genderCount + genderA) * genderCount + genderB) * intentCount +
      intentA) *
      intentCount +
    intentB
  );
}

export function deriveVector(
  profile: SyntheticProfile,
  role: "A" | "B",
  dictionary: SyntheticDictionary,
): OracleResult<Uint8Array> {
  if (
    !hasUniqueValues(dictionary.hobbies) ||
    !hasUniqueValues(dictionary.genders) ||
    !hasUniqueValues(dictionary.intents)
  ) {
    return { ok: false, error: "INVALID_DICTIONARY" };
  }
  if (!isValidProfile(profile, dictionary)) {
    return { ok: false, error: "INVALID_PROFILE" };
  }

  const vector = new Uint8Array(getCoordinateCount(dictionary));
  for (let index = 0; index < vector.length; index += 1) {
    vector[index] = Number(
      isActiveCoordinate(profile, role, dictionary, index),
    );
  }
  return { ok: true, data: vector };
}

export function checkCandidate(
  profileA: SyntheticProfile,
  profileB: SyntheticProfile,
  dictionary: SyntheticDictionary,
): OracleResult<boolean> {
  const vectorA = deriveVector(profileA, "A", dictionary);
  if (!vectorA.ok) return vectorA;
  const vectorB = deriveVector(profileB, "B", dictionary);
  if (!vectorB.ok) return vectorB;
  if (vectorA.data.length !== vectorB.data.length) {
    return { ok: false, error: "INVALID_VECTOR_LENGTH" };
  }

  return {
    ok: true,
    data: vectorA.data.some(
      (bit, index) => bit === 1 && vectorB.data[index] === 1,
    ),
  };
}
