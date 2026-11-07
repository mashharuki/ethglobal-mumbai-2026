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
  hashSessionToken,
  parseSessionCookie,
} from "./auth/session.ts";

type AppContext = Context<{ Bindings: CloudflareBindings }>;
type ApiErrorCode =
  | "INVALID_INPUT"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UNAVAILABLE";

const app = new Hono<{ Bindings: CloudflareBindings }>();

function getAuthStore(
  env: CloudflareBindings,
  address: string,
): DurableObjectStub<AuthStore> {
  return env.AUTH_STORE.getByName(address.toLowerCase());
}

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
  const cookie = parseSessionCookie(getCookie(c, "st_session"));
  if (!cookie) return sendError(c, 401, "UNAUTHENTICATED");
  const store = getAuthStore(c.env, cookie.address);
  const tokenHash = await hashSessionToken(cookie.token);
  if (!(await store.hasSession(tokenHash)))
    return sendError(c, 401, "UNAUTHENTICATED");
  const operation = await store.getPrivateOperation(operationId.data);
  if (!operation) return sendError(c, 404, "NOT_FOUND");
  return c.json(operation, 200);
});

app.onError((_error, c) => {
  console.error(
    JSON.stringify({
      operation: c.req.method,
      error: "unhandled",
    }),
  );
  return sendError(c, 503, "UNAVAILABLE");
});

export { AuthStore };
export default app;
