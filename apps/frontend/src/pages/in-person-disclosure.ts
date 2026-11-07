export type DisclosureField = "job" | "ageBand";

type PrivateField = { value: string; salt: string };

export type PrivateRegistration = {
  subject: string;
  version: string;
  fields: Record<DisclosureField, PrivateField>;
};

export type MatchedRegistration = {
  status: "matched" | "pending";
  subject: string;
  registrationVersion: string;
  commitments: Record<DisclosureField, string>;
};

export type DisclosureResult =
  | {
      ok: true;
      data: {
        field: DisclosureField;
        label: string;
        value: string;
        registrationVersion: string;
        previewOnly: true;
      };
    }
  | {
      ok: false;
      error:
        | "MATCH_NOT_CONFIRMED"
        | "SUBJECT_MISMATCH"
        | "VERSION_MISMATCH"
        | "VALUE_MISMATCH"
        | "UNAVAILABLE";
    };

const fieldLabels: Record<DisclosureField, string> = {
  job: "職業",
  ageBand: "年齢帯",
};

async function hashField(
  registration: PrivateRegistration,
  field: DisclosureField,
): Promise<string> {
  const { value, salt } = registration.fields[field];
  const content = JSON.stringify([
    "secret-tinder:in-person:v1",
    registration.subject,
    registration.version,
    field,
    value,
    salt,
  ]);
  const bytes = new TextEncoder().encode(content);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return `0x${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function verifyInPersonDisclosure(
  registration: PrivateRegistration,
  match: MatchedRegistration,
  field: DisclosureField,
): Promise<DisclosureResult> {
  if (match.status !== "matched") {
    return { ok: false, error: "MATCH_NOT_CONFIRMED" };
  }
  if (registration.subject !== match.subject) {
    return { ok: false, error: "SUBJECT_MISMATCH" };
  }
  if (registration.version !== match.registrationVersion) {
    return { ok: false, error: "VERSION_MISMATCH" };
  }
  const item = registration.fields[field];
  if (!item?.value || !item.salt || !match.commitments[field]) {
    return { ok: false, error: "UNAVAILABLE" };
  }
  try {
    if ((await hashField(registration, field)) !== match.commitments[field]) {
      return { ok: false, error: "VALUE_MISMATCH" };
    }
  } catch {
    return { ok: false, error: "UNAVAILABLE" };
  }
  return {
    ok: true,
    data: {
      field,
      label: fieldLabels[field],
      value: item.value,
      registrationVersion: registration.version,
      previewOnly: true,
    },
  };
}
