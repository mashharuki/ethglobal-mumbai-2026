import { isAddress, isHex, toFunctionSelector } from "viem";

import type { AnonymousWorker } from "./connect.ts";

type Result<T, E extends string> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export type AnonRpcSession = {
  worker: AnonymousWorker;
  close(): void;
};

const noxSpecifier = "0x35133267A8F7EC35046a83DCA0f4Ca8A6e1b7A9A";
const bootstrapRpcUrl = "https://ethereum-sepolia-rpc.publicnode.com";
const specifierSelectors = new Set<string>([
  toFunctionSelector("workerHash()"),
  toFunctionSelector("workerResolvers()"),
]);

export function createSpecifierBootstrapProvider(
  fetchRpc: typeof fetch = fetch,
): {
  request(input: { method: string; params?: unknown[] }): Promise<unknown>;
} {
  return {
    async request({ method, params }): Promise<unknown> {
      const call = params?.[0];
      if (
        method !== "eth_call" ||
        params?.[1] !== "latest" ||
        !call ||
        typeof call !== "object" ||
        !("to" in call) ||
        !("data" in call) ||
        typeof call.to !== "string" ||
        !isAddress(call.to) ||
        call.to.toLowerCase() !== noxSpecifier.toLowerCase() ||
        typeof call.data !== "string" ||
        !specifierSelectors.has(call.data)
      ) {
        throw new Error(
          "Only Nox specifier reads are allowed during bootstrap",
        );
      }
      const response = await fetchRpc(bootstrapRpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error("Specifier bootstrap RPC failed");
      const payload: unknown = await response.json();
      if (
        !payload ||
        typeof payload !== "object" ||
        !("result" in payload) ||
        typeof payload.result !== "string" ||
        !isHex(payload.result)
      ) {
        throw new Error("Specifier bootstrap RPC returned invalid data");
      }
      return payload.result;
    },
  };
}

export async function startSepoliaAnonRpc(): Promise<
  Result<AnonRpcSession, "BROWSER_UNAVAILABLE" | "ANON_RPC_UNAVAILABLE">
> {
  if (typeof document === "undefined") {
    return { ok: false, error: "BROWSER_UNAVAILABLE" };
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  let closeWorker = (): void => {};
  try {
    const { AnonRpcWorker } = await import("@anon-rpc/browser-harness");
    const worker = new AnonRpcWorker({
      address: noxSpecifier,
      preExisting: { rpcProvider: createSpecifierBootstrapProvider() },
    });
    closeWorker = () => worker.close();
    await Promise.race([
      worker.ready,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Worker timeout")), 60_000);
      }),
    ]);
    return { ok: true, data: { worker, close: closeWorker } };
  } catch {
    closeWorker();
    return { ok: false, error: "ANON_RPC_UNAVAILABLE" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
