import assert from "node:assert/strict";
import { describe, it } from "node:test";
import scenarios from "../specs/001-private-dating/fixtures/scenarios.json" with {
  type: "json",
};
import {
  checkCandidate,
  deriveVector,
  getCoordinateCount,
  getCoordinateIndex,
  type SyntheticDictionary,
  type SyntheticProfile,
} from "./oracle.ts";

const dictionary: SyntheticDictionary = scenarios.dictionary;
const profileA: SyntheticProfile = scenarios.participants.A;
const profileB: SyntheticProfile = scenarios.participants.B;

const cases: {
  id: string;
  a: SyntheticProfile;
  b: SyntheticProfile;
  expected: boolean;
}[] = [
  { id: "all-conditions", a: profileA, b: profileB, expected: true },
  {
    id: "no-shared-hobby",
    a: profileA,
    b: { ...profileB, hobbies: ["h3"] },
    expected: false,
  },
  {
    id: "a-gender-preference-fails",
    a: { ...profileA, acceptsGenders: ["g3"] },
    b: profileB,
    expected: false,
  },
  {
    id: "b-gender-preference-fails",
    a: profileA,
    b: { ...profileB, acceptsGenders: ["g2"] },
    expected: false,
  },
  {
    id: "a-intent-preference-fails",
    a: { ...profileA, acceptsIntents: ["i1"] },
    b: profileB,
    expected: false,
  },
  {
    id: "b-intent-preference-fails",
    a: profileA,
    b: { ...profileB, acceptsIntents: ["i2"] },
    expected: false,
  },
  {
    id: "both-unspecified",
    a: { ...profileA, acceptsGenders: ["*"], acceptsIntents: ["*"] },
    b: { ...profileB, acceptsGenders: ["*"], acceptsIntents: ["*"] },
    expected: true,
  },
];

describe("synthetic plaintext matching oracle", () => {
  it("should use the fixed 288-coordinate dictionary order", () => {
    assert.equal(
      getCoordinateCount(dictionary),
      scenarios.dictionary.coordinates,
    );
    assert.equal(getCoordinateIndex(dictionary, 0, 0, 0, 0, 0), 0);
    assert.equal(getCoordinateIndex(dictionary, 0, 0, 0, 0, 1), 1);
    assert.equal(getCoordinateIndex(dictionary, 0, 0, 0, 1, 0), 2);
    assert.equal(getCoordinateIndex(dictionary, 0, 0, 1, 0, 0), 4);
    assert.equal(getCoordinateIndex(dictionary, 0, 1, 0, 0, 0), 12);
    assert.equal(getCoordinateIndex(dictionary, 1, 0, 0, 0, 0), 36);
    assert.equal(getCoordinateIndex(dictionary, 7, 2, 2, 1, 1), 287);
  });

  for (const testCase of cases) {
    it(`should match the ${testCase.id} fixture condition`, () => {
      const fixture = scenarios.matchingCases.find(
        (candidate) => candidate.id === testCase.id,
      );
      assert.equal(fixture?.expectedCandidate, testCase.expected);
      assert.deepEqual(checkCandidate(testCase.a, testCase.b, dictionary), {
        ok: true,
        data: testCase.expected,
      });
    });
  }

  it("should keep every derived coordinate binary", () => {
    for (const role of ["A", "B"] as const) {
      const result = deriveVector(
        role === "A" ? profileA : profileB,
        role,
        dictionary,
      );
      assert.equal(result.ok, true);
      if (!result.ok) return;
      assert.equal(result.data.length, 288);
      assert.equal(
        result.data.every((bit) => bit === 0 || bit === 1),
        true,
      );
    }
  });

  it("should reject a preference outside the dictionary", () => {
    assert.deepEqual(
      deriveVector({ ...profileA, acceptsGenders: ["g4"] }, "A", dictionary),
      { ok: false, error: "INVALID_PROFILE" },
    );
  });

  it("should reject a wildcard mixed with explicit preferences", () => {
    assert.deepEqual(
      deriveVector(
        { ...profileA, acceptsGenders: ["*", "g2"] },
        "A",
        dictionary,
      ),
      { ok: false, error: "INVALID_PROFILE" },
    );
  });

  it("should reject an empty or duplicated dictionary", () => {
    assert.deepEqual(
      deriveVector(profileA, "A", { ...dictionary, hobbies: [] }),
      { ok: false, error: "INVALID_DICTIONARY" },
    );
    assert.deepEqual(
      deriveVector(profileA, "A", { ...dictionary, genders: ["g1", "g1"] }),
      { ok: false, error: "INVALID_DICTIONARY" },
    );
  });
});
