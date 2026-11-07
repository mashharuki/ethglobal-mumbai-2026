import { simulationAssertionSchema } from "../../../../packages/shared/src/simulation/contract.ts";

type HandoffReady = { type: "secret-tinder:ready"; version: 1 };

export function getTrustedAibotOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    const isLocal =
      url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (
      (url.protocol !== "https:" && !(isLocal && url.protocol === "http:")) ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function isTrustedHandoffReady(
  event: Pick<MessageEvent, "origin" | "source" | "data">,
  popup: Window,
  expectedOrigin: string,
): event is typeof event & { data: HandoffReady } {
  if (event.origin !== expectedOrigin || event.source !== popup) return false;
  if (typeof event.data !== "object" || event.data === null) return false;
  return event.data.type === "secret-tinder:ready" && event.data.version === 1;
}

function waitForAibotReady(
  popup: Window,
  origin: string,
  browser: Window,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = browser.setTimeout(() => {
      browser.removeEventListener("message", onMessage);
      reject(new Error("AIBot did not confirm its origin"));
    }, 15_000);
    function onMessage(event: MessageEvent): void {
      if (!isTrustedHandoffReady(event, popup, origin)) return;
      browser.clearTimeout(timer);
      browser.removeEventListener("message", onMessage);
      resolve();
    }
    browser.addEventListener("message", onMessage);
    popup.location.href = `${origin}/handoff`;
  });
}

export async function handoffToAibot(
  aibotUrl: string,
  fetcher: typeof fetch = fetch,
  browser: Window = window,
): Promise<void> {
  const origin = getTrustedAibotOrigin(aibotUrl);
  if (!origin) throw new Error("AIBot origin is not trusted");
  const popup = browser.open("about:blank", "_blank");
  if (!popup) throw new Error("The AIBot window was blocked");
  try {
    await waitForAibotReady(popup, origin, browser);
    if (popup.closed) throw new Error("The AIBot window was closed");
    const response = await fetcher("/v1/simulation/identity", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "X-Operation-Id": crypto.randomUUID() },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Identity handoff is unavailable");
    const body = (await response.json()) as unknown;
    if (typeof body !== "object" || body === null)
      throw new Error("Invalid identity response");
    const assertion = simulationAssertionSchema.parse(
      Reflect.get(body, "assertion"),
    );
    const expiresAt = Reflect.get(body, "expiresAt");
    if (typeof expiresAt !== "string" || Date.parse(expiresAt) <= Date.now()) {
      throw new Error("Identity assertion expired");
    }
    if (popup.closed) throw new Error("The AIBot window was closed");
    popup.postMessage(
      { type: "secret-tinder:assertion", version: 1, assertion },
      origin,
    );
  } catch (error) {
    popup.close();
    throw error;
  }
}
