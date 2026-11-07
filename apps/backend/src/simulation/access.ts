import {
  authorizedSimulationMatchSchema,
  simulationPersonaMetadataSchema,
} from "shared";

type Participant = {
  subject: string;
  personaId: string;
  personaVersion: number;
  participate: boolean;
  allowPersonaUse: boolean;
  blockedSubjects: readonly string[];
};

export type SimulationMatchEvidence = {
  matchId: string;
  status: "pending" | "confirmed";
  expiresAt: number;
  participants: readonly [Participant, Participant];
};

function getConsentedCounterpart(
  evidence: SimulationMatchEvidence,
  playerSubject: string,
  nowSeconds: number,
): Participant | null {
  const [first, second] = evidence.participants;
  const player = first.subject === playerSubject ? first : second;
  const other = player === first ? second : first;
  if (
    first.subject === second.subject ||
    player.subject !== playerSubject ||
    evidence.status !== "confirmed" ||
    evidence.expiresAt <= nowSeconds ||
    !player.participate ||
    !other.participate ||
    !player.allowPersonaUse ||
    !other.allowPersonaUse ||
    player.blockedSubjects.includes(other.subject) ||
    other.blockedSubjects.includes(player.subject)
  ) {
    return null;
  }
  return other;
}

export async function authorizeSimulationMatch(
  evidence: SimulationMatchEvidence,
  playerSubject: string,
  fetchPersonaMetadata: (personaId: string) => Promise<unknown>,
  nowSeconds: number,
): Promise<
  | {
      ok: true;
      data: ReturnType<typeof authorizedSimulationMatchSchema.parse>;
    }
  | { ok: false; error: "NOT_FOUND" | "UNAVAILABLE" }
> {
  const other = getConsentedCounterpart(evidence, playerSubject, nowSeconds);
  if (!other) return { ok: false, error: "NOT_FOUND" };

  let rawMetadata: unknown;
  try {
    rawMetadata = await fetchPersonaMetadata(other.personaId);
  } catch {
    return { ok: false, error: "UNAVAILABLE" };
  }
  const metadata = simulationPersonaMetadataSchema.safeParse(rawMetadata);
  if (!metadata.success) return { ok: false, error: "UNAVAILABLE" };
  if (
    metadata.data.personaId !== other.personaId ||
    metadata.data.ownerSubject !== other.subject ||
    metadata.data.status !== "approved" ||
    metadata.data.version !== other.personaVersion
  ) {
    return { ok: false, error: "NOT_FOUND" };
  }
  const authorized = authorizedSimulationMatchSchema.safeParse({
    matchId: evidence.matchId,
    agentPersonaId: other.personaId,
    playerSubject,
    simulationConsent: true,
    expiresAt: evidence.expiresAt,
  });
  if (!authorized.success) return { ok: false, error: "UNAVAILABLE" };
  return { ok: true, data: authorized.data };
}
