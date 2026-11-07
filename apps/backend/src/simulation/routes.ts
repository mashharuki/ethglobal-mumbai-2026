import { type Context, Hono } from "hono";
import {
  type AuthorizedSimulationMatch,
  authorizedSimulationMatchSchema,
  simulationDateRequestInputSchema,
  simulationDateRequestSchema,
} from "shared";
import {
  authorizeSimulationMatch,
  type SimulationMatchEvidence,
} from "./access.ts";

type SimulationBindings = CloudflareBindings & {
  MATCHING_API_TOKEN?: string;
  AIBOT_ORIGIN?: string;
  AIBOT_PARENT_SERVICE_TOKEN?: string;
};
type AibotMetadataConfig = Pick<
  SimulationBindings,
  "AIBOT_ORIGIN" | "AIBOT_PARENT_SERVICE_TOKEN"
>;
type RouteContext = Context<{ Bindings: CloudflareBindings }>;
type DateRequestWrite =
  | { ok: true; data: { requestId: string; status: "pending" } }
  | { ok: false; error: "CONFLICT" };

export type PendingDateRequest = {
  playerSubject: string;
  matchId: string;
  gameSessionId: string;
};

export type SimulationRoutesDependencies = {
  loadMatchEvidence: (
    matchId: string,
  ) => Promise<SimulationMatchEvidence | null>;
  // Implementations must atomically persist by gameSessionId across Worker restarts.
  createPendingDateRequest: (
    input: PendingDateRequest,
  ) => Promise<DateRequestWrite>;
  fetchPersonaMetadata?: (
    env: SimulationBindings,
    personaId: string,
  ) => Promise<unknown>;
  nowSeconds?: () => number;
};

function sendError(
  c: RouteContext,
  status: 401 | 404 | 409 | 422 | 503,
  code:
    | "UNAUTHENTICATED"
    | "NOT_FOUND"
    | "CONFLICT"
    | "INVALID_INPUT"
    | "UNAVAILABLE",
): Response {
  c.header("Cache-Control", "no-store");
  return c.json(
    { code, message: code.toLowerCase().replaceAll("_", " ") },
    status,
  );
}

async function isServiceAuthorized(
  authorization: string | undefined,
  expected: string | undefined,
): Promise<boolean> {
  if (!expected || !authorization?.startsWith("Bearer ")) return false;
  const received = authorization.slice(7);
  if (!received || /\s/.test(received)) return false;
  const [left, right] = await Promise.all(
    [received, expected].map((value) =>
      crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  );
  const first = new Uint8Array(left);
  const second = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) {
    difference |= first[index] ^ second[index];
  }
  return difference === 0;
}

function getPlayerSubject(c: RouteContext): string | null {
  const parsed = authorizedSimulationMatchSchema.shape.playerSubject.safeParse(
    c.req.header("X-Player-Subject"),
  );
  return parsed.success ? parsed.data : null;
}

async function readJsonBody(c: RouteContext): Promise<unknown> {
  if (!c.req.header("Content-Type")?.startsWith("application/json"))
    return null;
  const text = await c.req.text();
  if (text.length > 8192) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function fetchAibotPersonaMetadata(
  env: AibotMetadataConfig,
  personaId: string,
  fetcher: typeof fetch = fetch,
): Promise<unknown> {
  const origin = env.AIBOT_ORIGIN;
  const token = env.AIBOT_PARENT_SERVICE_TOKEN;
  if (!origin || !token)
    throw new Error("Persona metadata service is unconfigured");
  const url = new URL(origin);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("Persona metadata origin must be HTTPS");
  const endpoint = new URL(
    `/api/personas/${encodeURIComponent(personaId)}/metadata`,
    url.origin,
  );
  const response = await fetcher(endpoint, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error("Persona metadata service unavailable");
  return response.json() as Promise<unknown>;
}

async function authorizeRequest(
  c: RouteContext,
  matchId: string,
  playerSubject: string,
  deps: SimulationRoutesDependencies,
): Promise<
  | { ok: true; data: AuthorizedSimulationMatch }
  | { ok: false; status: 404 | 503 }
> {
  let evidence: SimulationMatchEvidence | null;
  try {
    evidence = await deps.loadMatchEvidence(matchId);
  } catch {
    return { ok: false, status: 503 };
  }
  if (!evidence || evidence.matchId !== matchId)
    return { ok: false, status: 404 };
  const metadata = deps.fetchPersonaMetadata ?? fetchAibotPersonaMetadata;
  const result = await authorizeSimulationMatch(
    evidence,
    playerSubject,
    (personaId) => metadata(c.env as SimulationBindings, personaId),
    (deps.nowSeconds ?? (() => Math.floor(Date.now() / 1000)))(),
  );
  if (!result.ok)
    return { ok: false, status: result.error === "UNAVAILABLE" ? 503 : 404 };
  return { ok: true, data: result.data };
}

// No real match repository exists yet. Mount this only after supplying verified,
// persistent match evidence and an atomic date-request repository.
export function createSimulationRoutes(
  deps: SimulationRoutesDependencies,
): Hono<{ Bindings: CloudflareBindings }> {
  const routes = new Hono<{ Bindings: CloudflareBindings }>();

  routes.use("*", async (c, next) => {
    const isAuthorized = await isServiceAuthorized(
      c.req.header("Authorization"),
      (c.env as SimulationBindings).MATCHING_API_TOKEN,
    );
    if (!isAuthorized) return sendError(c, 401, "UNAUTHENTICATED");
    await next();
    c.header("Cache-Control", "no-store");
  });

  routes.get("/matches/:matchId", async (c) => {
    const matchId = simulationDateRequestInputSchema.shape.matchId.safeParse(
      c.req.param("matchId"),
    );
    const subject = getPlayerSubject(c);
    if (!matchId.success || !subject) return sendError(c, 404, "NOT_FOUND");
    const authorized = await authorizeRequest(c, matchId.data, subject, deps);
    if (!authorized.ok)
      return sendError(
        c,
        authorized.status,
        authorized.status === 503 ? "UNAVAILABLE" : "NOT_FOUND",
      );
    return c.json(authorized.data, 200);
  });

  routes.post("/date-requests", async (c) => {
    const subject = getPlayerSubject(c);
    if (!subject) return sendError(c, 401, "UNAUTHENTICATED");
    const parsed = simulationDateRequestInputSchema.safeParse(
      await readJsonBody(c),
    );
    if (!parsed.success) return sendError(c, 422, "INVALID_INPUT");
    const key = c.req.header("Idempotency-Key");
    if (key !== parsed.data.gameSessionId) return sendError(c, 409, "CONFLICT");
    const authorized = await authorizeRequest(
      c,
      parsed.data.matchId,
      subject,
      deps,
    );
    if (!authorized.ok)
      return sendError(
        c,
        authorized.status,
        authorized.status === 503 ? "UNAVAILABLE" : "NOT_FOUND",
      );
    let stored: DateRequestWrite;
    try {
      stored = await deps.createPendingDateRequest({
        playerSubject: subject,
        matchId: parsed.data.matchId,
        gameSessionId: parsed.data.gameSessionId,
      });
    } catch {
      return sendError(c, 503, "UNAVAILABLE");
    }
    if (!stored.ok) return sendError(c, 409, "CONFLICT");
    const response = simulationDateRequestSchema.safeParse(stored.data);
    if (!response.success) return sendError(c, 503, "UNAVAILABLE");
    return c.json(response.data, 202);
  });

  return routes;
}
