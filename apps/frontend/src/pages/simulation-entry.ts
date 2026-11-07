import {
  authorizedSimulationMatchSchema,
  simulationConsentRequestSchema,
  simulationConsentSchema,
} from "../../../../packages/shared/src/simulation/contract.ts";

export type SimulationConsent = ReturnType<
  typeof simulationConsentSchema.parse
>;
export type SimulationConsentRequest = ReturnType<
  typeof simulationConsentRequestSchema.parse
>;

export type SimulationEntry =
  | { kind: "unavailable" }
  | {
      kind: "authorized";
      matchId: string;
      expiresAt: number;
      consent: SimulationConsent;
      matchKind: "synthetic" | "real";
      modelKind: "scripted" | "live";
    };

export type SimulationActions = {
  saveConsent: (
    matchId: string,
    request: SimulationConsentRequest,
  ) => Promise<SimulationConsent>;
  openAIBot: () => Promise<void>;
  restart: () => Promise<void>;
};

export type SimulationGate =
  | "unavailable"
  | "checking"
  | "expired"
  | "consent-required"
  | "ready";

const standaloneDemoUrl = "https://love-match-masala.vercel.app/";

export function getStandaloneDemoHref(
  hasSeparateAiConsent: boolean,
): string | null {
  return hasSeparateAiConsent ? standaloneDemoUrl : null;
}

export function getSimulationGate(
  entry: SimulationEntry,
  consent: SimulationConsent | null,
  nowSeconds: number | null,
): SimulationGate {
  if (entry.kind === "unavailable") return "unavailable";
  if (
    !Number.isSafeInteger(entry.expiresAt) ||
    entry.expiresAt <= 0 ||
    Number.isNaN(new Date(entry.expiresAt * 1000).getTime())
  ) {
    return "unavailable";
  }
  if (nowSeconds === null) return "checking";
  if (entry.expiresAt <= nowSeconds) return "expired";
  if (!consent?.participate || !consent.allowPersonaUse) {
    return "consent-required";
  }
  return "ready";
}

export function createSimulationConsentApi(fetcher: typeof fetch = fetch) {
  return async (
    matchId: string,
    request: SimulationConsentRequest,
  ): Promise<SimulationConsent> => {
    const id = authorizedSimulationMatchSchema.shape.matchId.parse(matchId);
    const body = simulationConsentRequestSchema.parse(request);
    const response = await fetcher(
      `/v1/matches/${encodeURIComponent(id)}/simulation-consents/me`,
      {
        method: "PUT",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-Operation-Id": crypto.randomUUID(),
        },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok)
      throw new Error(`AI consent API returned ${response.status}`);
    return simulationConsentSchema.parse(await response.json());
  };
}
