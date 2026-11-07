/// <reference types="node" />

import assert from "node:assert/strict";
import { it } from "node:test";

import {
  type MatchedRegistration,
  type PrivateRegistration,
  verifyInPersonDisclosure,
} from "./in-person-disclosure.ts";

const registration = {
  subject: "synthetic-a",
  version: "profile-v1",
  fields: {
    job: { value: "synthetic-job-a", salt: "fixture-job-salt" },
    ageBand: { value: "synthetic-adult-a", salt: "fixture-age-salt" },
  },
} satisfies PrivateRegistration;

// Fixed at the fictional match time; these values are not recomputed from the
// possibly edited registration during verification.
const match = {
  status: "matched",
  subject: "synthetic-a",
  registrationVersion: "profile-v1",
  commitments: {
    job: "0x8483b3913eefa567e89504f5384d2ae85b51fdd6f8ff0f733f8a0881068b0f63",
    ageBand:
      "0x1e5874541622f74db76f9ae2a23feae03ea5f5d7e99efe24421024fb9dc64cf1",
  },
} satisfies MatchedRegistration;

it("should show only the selected occupation when the matched version agrees", async () => {
  const result = await verifyInPersonDisclosure(registration, match, "job");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.value, "synthetic-job-a");
  assert.equal(result.data.registrationVersion, "profile-v1");
  assert.doesNotMatch(JSON.stringify(result), /synthetic-adult-a|ageBand/);
});

it("should show only the selected age band when the matched version agrees", async () => {
  const result = await verifyInPersonDisclosure(registration, match, "ageBand");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.value, "synthetic-adult-a");
  assert.doesNotMatch(JSON.stringify(result), /synthetic-job-a|"job"/);
});

it("should reject an edited registered value without revealing it", async () => {
  const edited = {
    ...registration,
    fields: {
      ...registration.fields,
      job: { ...registration.fields.job, value: "synthetic-job-edited" },
    },
  } satisfies PrivateRegistration;
  const result = await verifyInPersonDisclosure(edited, match, "job");
  assert.deepEqual(result, { ok: false, error: "VALUE_MISMATCH" });
});

it("should reject another registration version and participant", async () => {
  const oldMatch = { ...match, registrationVersion: "profile-v0" };
  const otherMatch = { ...match, subject: "synthetic-b" };
  assert.deepEqual(
    await verifyInPersonDisclosure(registration, oldMatch, "job"),
    {
      ok: false,
      error: "VERSION_MISMATCH",
    },
  );
  assert.deepEqual(
    await verifyInPersonDisclosure(registration, otherMatch, "job"),
    {
      ok: false,
      error: "SUBJECT_MISMATCH",
    },
  );
});

it("should keep a pending match closed and the preview free of network writes", async () => {
  assert.deepEqual(
    await verifyInPersonDisclosure(
      registration,
      { ...match, status: "pending" },
      "job",
    ),
    { ok: false, error: "MATCH_NOT_CONFIRMED" },
  );
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("Fixture preview must not use the network");
  };
  try {
    const result = await verifyInPersonDisclosure(registration, match, "job");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.data.previewOnly, true);
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
