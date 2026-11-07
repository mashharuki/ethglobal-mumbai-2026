import { isAddressEqual } from "viem";
import { verifyCurrentForAdmission } from "../../../../scripts/verify-participation.ts";
import type { VerifiedCredential } from "./admission.ts";

const demoNames = [
  { label: "alice", subject: "0xfb6DF0D12052a1c8E58920654D44015C61552E57" },
  { label: "bob", subject: "0xD1D13C313FfBB0dD00898D8c705794D082Dc388e" },
] as const;

export async function readDemoParticipationCredential(
  subject: `0x${string}`,
  verify: typeof verifyCurrentForAdmission = verifyCurrentForAdmission,
): Promise<
  | { ok: true; data: VerifiedCredential }
  | { ok: false; error: "ineligible" | "unavailable" }
> {
  const demo = demoNames.find((item) => isAddressEqual(item.subject, subject));
  if (!demo) return { ok: false, error: "unavailable" };
  const current = await verify(demo.label);
  if (!current.ok) return current;
  if (!isAddressEqual(current.data.subject, subject)) {
    return { ok: false, error: "ineligible" };
  }
  return current;
}
