import { simulationIdentityClaimsSchema } from "shared";

const ASSERTION_LIFETIME_SECONDS = 600;

export function getMatchingIdentitySecret(
  env: CloudflareBindings & { MATCHING_IDENTITY_SECRET?: string },
): string | undefined {
  return env.MATCHING_IDENTITY_SECRET;
}

function encodeBase64Url(input: Uint8Array): string {
  return btoa(String.fromCharCode(...input))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export async function createSimulationAssertion(
  subject: string,
  secret: string,
  expiresAt: number,
): Promise<string> {
  if (secret.length < 32) throw new Error("Simulation secret is unavailable");
  const claims = simulationIdentityClaimsSchema.parse({
    sub: subject,
    aud: "love-match-masala",
    exp: expiresAt,
  });
  const payload = encodeBase64Url(
    new TextEncoder().encode(JSON.stringify(claims)),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return `${payload}.${encodeBase64Url(new Uint8Array(signature))}`;
}

export function getSimulationAssertionExpiry(nowSeconds: number): number {
  return nowSeconds + ASSERTION_LIFETIME_SECONDS;
}
