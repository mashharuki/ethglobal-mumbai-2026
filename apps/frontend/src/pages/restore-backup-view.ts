import type { RegistrationPrivateMaterial } from "../proofs/register.ts";

export const disclosureFields = [
  "hobbies",
  "gender",
  "intent",
  "acceptsGenders",
  "acceptsIntents",
  "job",
  "ageBand",
] as const;

export type DisclosureField = (typeof disclosureFields)[number];

export function getSelectedSyntheticValue(
  material: RegistrationPrivateMaterial | null,
  field: DisclosureField | "none",
): string | null {
  if (
    !material ||
    field === "none" ||
    !disclosureFields.includes(field as DisclosureField)
  )
    return null;
  const value = material.profile[field];
  return Array.isArray(value) ? value.join(", ") : String(value);
}
