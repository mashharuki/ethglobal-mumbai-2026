import { getAddress, isAddress } from "viem";

export type WalletProvider = {
  request(input: {
    method: string;
    params?: readonly unknown[];
  }): Promise<unknown>;
};

export type AnonymousWorker = {
  fetch(input: string, init: RequestInit): Promise<Response>;
};

type Result<T, E extends string> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export type WalletConnection = Result<
  { address: `0x${string}`; chainId: 11155111 },
  | "PROVIDER_UNAVAILABLE"
  | "WRONG_CHAIN"
  | "ACCOUNT_UNAVAILABLE"
  | "CONNECTION_FAILED"
>;

export type SepoliaRead = Result<
  { chainId: 11155111; blockNumber: bigint; transport: "anon-rpc" },
  "ANON_RPC_UNAVAILABLE" | "WRONG_CHAIN" | "INVALID_RESPONSE" | "READ_FAILED"
>;

const sepoliaChainId = "0xaa36a7";
const sepoliaRpcUrl = "https://ethereum-sepolia-rpc.publicnode.com";

function parseQuantity(value: unknown): bigint | null {
  if (
    typeof value !== "string" ||
    !/^0x(?:0|[1-9a-fA-F][0-9a-fA-F]*)$/.test(value)
  ) {
    return null;
  }
  return BigInt(value);
}

export async function connectSepoliaWallet(
  provider: WalletProvider | null,
): Promise<WalletConnection> {
  if (!provider) return { ok: false, error: "PROVIDER_UNAVAILABLE" };
  try {
    const chainId = await provider.request({ method: "eth_chainId" });
    if (parseQuantity(chainId) !== BigInt(sepoliaChainId)) {
      return { ok: false, error: "WRONG_CHAIN" };
    }
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (
      !Array.isArray(accounts) ||
      typeof accounts[0] !== "string" ||
      !isAddress(accounts[0])
    ) {
      return { ok: false, error: "ACCOUNT_UNAVAILABLE" };
    }
    return {
      ok: true,
      data: { address: getAddress(accounts[0]), chainId: 11155111 },
    };
  } catch {
    return { ok: false, error: "CONNECTION_FAILED" };
  }
}

async function requestAnonymousRpc(
  worker: AnonymousWorker,
  method: "eth_chainId" | "eth_blockNumber",
): Promise<string | null> {
  const response = await worker.fetch(sepoliaRpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
    cache: "no-store",
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) return null;
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || !("result" in payload)) {
    return null;
  }
  return typeof payload.result === "string" ? payload.result : null;
}

export async function readSepoliaBlock(
  worker: AnonymousWorker | null,
): Promise<SepoliaRead> {
  // The EIP-1193 wallet is not a fallback RPC. A verified anon worker must be
  // supplied by the browser harness before any application chain read begins.
  if (!worker) return { ok: false, error: "ANON_RPC_UNAVAILABLE" };
  try {
    const chainId = await requestAnonymousRpc(worker, "eth_chainId");
    const parsedChainId = parseQuantity(chainId);
    if (parsedChainId === null) {
      return { ok: false, error: "INVALID_RESPONSE" };
    }
    if (parsedChainId !== 11155111n) {
      return { ok: false, error: "WRONG_CHAIN" };
    }
    const block = await requestAnonymousRpc(worker, "eth_blockNumber");
    const blockNumber = parseQuantity(block);
    if (blockNumber === null) {
      return { ok: false, error: "INVALID_RESPONSE" };
    }
    return {
      ok: true,
      data: {
        chainId: 11155111,
        blockNumber,
        transport: "anon-rpc",
      },
    };
  } catch {
    return { ok: false, error: "READ_FAILED" };
  }
}
