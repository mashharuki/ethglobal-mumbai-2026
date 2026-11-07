/// <reference types="node" />

import assert from "node:assert/strict";
import { it } from "node:test";

import type { RegistrationPrivateMaterial } from "../proofs/register.ts";
import {
  type DisclosureField,
  getSelectedSyntheticValue,
} from "./restore-backup-view.ts";

const material: RegistrationPrivateMaterial = {
  subjectId: "0x123",
  issuanceId: "0x456",
  profileVersion: 1,
  root: "0x123",
  salts: ["secret-salt"],
  profile: {
    hobbies: ["h1", "h2"],
    gender: "g1",
    intent: "i1",
    acceptsGenders: ["g2"],
    acceptsIntents: ["*"],
    job: 201,
    ageBand: 301,
  },
};

it("should disclose only the field explicitly selected after restore", () => {
  assert.equal(getSelectedSyntheticValue(material, "none"), null);
  assert.equal(getSelectedSyntheticValue(null, "hobbies"), null);
  assert.equal(getSelectedSyntheticValue(material, "hobbies"), "h1, h2");
  assert.equal(getSelectedSyntheticValue(material, "job"), "201");
  assert.equal(getSelectedSyntheticValue(material, "gender"), "g1");
  assert.equal(
    getSelectedSyntheticValue(material, "salts" as DisclosureField),
    null,
  );
});
