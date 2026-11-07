import { type Context, Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
  authChallengeRequestSchema,
  authSessionRequestSchema,
  operationIdSchema,
} from "shared";
import { getAddress, isAddress } from "viem";
import { parseSiweMessage } from "viem/siwe";
import {
  AuthStore,
  getAuthenticatedAddress,
  getAuthStore,
} from "./auth/session.ts";
import { reviewRoutes } from "./participation/review-routes.ts";
import {
  createSimulationAssertion,
  getMatchingIdentitySecret,
  getSimulationAssertionExpiry,
} from "./simulation/identity.ts";

type AppContext = Context<{ Bindings: CloudflareBindings }>;
type ApiErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UNAVAILABLE";

const app = new Hono<{ Bindings: CloudflareBindings }>();

function sendError(
  c: AppContext,
  status: 401 | 404 | 409 | 422 | 429 | 503,
  code: ApiErrorCode,
): Response {
  if (status === 429) c.header("Retry-After", "60");
  return c.json(
    { code, message: code.toLowerCase().replaceAll("_", " ") },
    status,
  );
}

function getRequestOrigin(c: AppContext): string | null {
  const url = new URL(c.req.url);
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !isLocal) return null;
  return c.req.header("Origin") === url.origin ? url.origin : null;
}

async function readJsonBody(c: AppContext): Promise<unknown> {
  if (!c.req.header("Content-Type")?.startsWith("application/json"))
    return null;
  const body = await c.req.text();
  if (body.length > 8192) return null;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

app.use("*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "no-referrer");
  if (new URL(c.req.url).protocol === "https:") {
    c.header(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
});

app.post("/v1/auth/challenges", async (c) => {
  const origin = getRequestOrigin(c);
  if (!origin) return sendError(c, 422, "INVALID_INPUT");
  const parsed = authChallengeRequestSchema.safeParse(await readJsonBody(c));
  if (!parsed.success) return sendError(c, 422, "INVALID_INPUT");
  const store = getAuthStore(c.env, getAddress(parsed.data.address));
  const result = await store.issueChallenge(parsed.data.address, origin);
  if (!result.ok) {
    return sendError(
      c,
      result.error === "rate_limited" ? 429 : 422,
      result.error === "rate_limited" ? "RATE_LIMITED" : "INVALID_INPUT",
    );
  }
  return c.json(result.data, 200);
});

app.post("/v1/auth/sessions", async (c) => {
  const origin = getRequestOrigin(c);
  if (!origin) return sendError(c, 422, "INVALID_INPUT");
  const parsed = authSessionRequestSchema.safeParse(await readJsonBody(c));
  if (!parsed.success) return sendError(c, 422, "INVALID_INPUT");
  const siwe = parseSiweMessage(parsed.data.message);
  if (!siwe.address || !isAddress(siwe.address, { strict: false })) {
    return sendError(c, 401, "UNAUTHENTICATED");
  }
  const store = getAuthStore(c.env, getAddress(siwe.address));
  const result = await store.createSession(
    parsed.data.message,
    parsed.data.signature,
    origin,
  );
  if (!result.ok) {
    const status =
      result.error === "rate_limited"
        ? 429
        : result.error === "used"
          ? 409
          : 401;
    const code =
      status === 429
        ? "RATE_LIMITED"
        : status === 409
          ? "CONFLICT"
          : "UNAUTHENTICATED";
    return sendError(c, status, code);
  }
  setCookie(
    c,
    "st_session",
    `${siwe.address.toLowerCase()}.${result.data.token}`,
    {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      path: "/v1",
      maxAge: 900,
    },
  );
  return c.body(null, 204);
});

app.get("/v1/operations/:id", async (c) => {
  const operationId = operationIdSchema.safeParse(c.req.param("id"));
  if (!operationId.success) return sendError(c, 404, "NOT_FOUND");
  const address = await getAuthenticatedAddress(
    c.env,
    getCookie(c, "st_session"),
  );
  if (!address) return sendError(c, 401, "UNAUTHENTICATED");
  const store = getAuthStore(c.env, address);
  const operation = await store.getPrivateOperation(operationId.data);
  if (!operation) return sendError(c, 404, "NOT_FOUND");
  return c.json(operation, 200);
});

app.post("/v1/simulation/identity", async (c) => {
  if (!getRequestOrigin(c)) return sendError(c, 422, "INVALID_INPUT");
  const operationId = operationIdSchema.safeParse(
    c.req.header("X-Operation-Id"),
  );
  if (!operationId.success) return sendError(c, 422, "INVALID_INPUT");
  const subject = await getAuthenticatedAddress(
    c.env,
    getCookie(c, "st_session"),
  );
  if (!subject) return sendError(c, 401, "UNAUTHENTICATED");
  const secret = getMatchingIdentitySecret(c.env);
  if (!secret || secret.length < 32) return sendError(c, 503, "UNAVAILABLE");
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expiry = await getAuthStore(c.env, subject).getOrCreateSimulationExpiry(
    operationId.data,
    nowSeconds,
    getSimulationAssertionExpiry(nowSeconds),
  );
  if (!expiry) return sendError(c, 409, "CONFLICT");
  const assertion = await createSimulationAssertion(subject, secret, expiry);
  return c.json({
    assertion,
    expiresAt: new Date(expiry * 1000).toISOString(),
  });
});

app.route("/v1", reviewRoutes);

app.onError((_error, c) => {
  console.error(
    JSON.stringify({
      operation: c.req.method,
      error: "unhandled",
    }),
  );
  return sendError(c, 503, "UNAVAILABLE");
});

export { SearchCoordinator } from "./search/room.ts";
export { SimulationDateRequestStore } from "./simulation/date-request-store.ts";
export { AuthStore };
export default app;
