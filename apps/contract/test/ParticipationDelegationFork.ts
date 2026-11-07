import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BaseError,
  createPublicClient,
  ExecutionRevertedError,
  encodeFunctionData,
  http,
  isHex,
  keccak256,
  parseAbi,
  stringToHex,
  toHex,
} from "viem";
import { packetToBytes } from "viem/ens";

const isForkTest = process.env.RUN_ENS_FORK_TESTS === "1";
const forkUrl = process.env.ENS_FORK_RPC_URL ?? "http://127.0.0.1:8546";
const client = createPublicClient({
  transport: http(forkUrl, { retryCount: 0 }),
});
const issuer = "0xcA341CE4902756bF9e96e145014DD0aB36A0Fe8E";
const delegate = "0x5555555555555555555555555555555555555555";
const aliceResolver = "0x28a0549e48190d69Ae8Bf6046713F766B20A5598";
const bobResolver = "0xf40e2D397cDb891b57eA47CAeBEC26D080778a50";
const roleSetText = 1n << 4n;
const endpointResource = BigInt(keccak256(stringToHex("app.endpoint")));
const resolverAbi = parseAbi([
  "function setText(bytes name, string key, string value)",
  "function grantSetterRoles(bytes setter, address account)",
  "function revokeRoles(uint256 resource, uint256 roleBitmap, address account)",
  "function roles(uint256 resource, address account) view returns (uint256)",
]);

async function localRpc(method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(forkUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const result: unknown = await response.json();
  if (typeof result !== "object" || result === null)
    throw new Error("Invalid fork RPC");
  if ("error" in result) throw new Error(`Fork RPC ${method} failed`);
  if (!("result" in result)) throw new Error("Missing fork RPC result");
  return result.result;
}

async function sendForkTransaction(data: `0x${string}`): Promise<void> {
  const hash = await localRpc("eth_sendTransaction", [
    { from: issuer, to: aliceResolver, data, gas: "0x2dc6c0" },
  ]);
  if (typeof hash !== "string" || !isHex(hash) || hash.length !== 66) {
    throw new Error("Invalid fork transaction hash");
  }
  const receipt = await client.waitForTransactionReceipt({ hash });
  assert.equal(receipt.status, "success");
}

function encodeText(name: string, key: string): `0x${string}` {
  return encodeFunctionData({
    abi: resolverAbi,
    functionName: "setText",
    args: [toHex(packetToBytes(name)), key, "test"],
  });
}

async function canSetText(
  resolver: `0x${string}`,
  name: string,
  key: string,
): Promise<void> {
  await client.call({
    account: delegate,
    to: resolver,
    data: encodeText(name, key),
  });
}

function isExecutionRevert(error: unknown): boolean {
  return (
    error instanceof BaseError &&
    error.walk((cause) => cause instanceof ExecutionRevertedError) instanceof
      ExecutionRevertedError
  );
}

describe("ENSv2 delegated key on local Sepolia fork", {
  skip: !isForkTest,
}, () => {
  it("should grant one text key and reject updates after revocation", async () => {
    assert.notEqual(await client.getCode({ address: aliceResolver }), "0x");
    await localRpc("hardhat_impersonateAccount", [issuer]);
    await localRpc("hardhat_setBalance", [issuer, "0xde0b6b3a7640000"]);
    const resourceRoles = () =>
      client.readContract({
        address: aliceResolver,
        abi: resolverAbi,
        functionName: "roles",
        args: [endpointResource, delegate],
      });
    assert.equal(await resourceRoles(), 0n);
    const setter = encodeFunctionData({
      abi: resolverAbi,
      functionName: "setText",
      args: [
        toHex(packetToBytes("alice.secrettinder.eth")),
        "app.endpoint",
        "",
      ],
    });
    await sendForkTransaction(
      encodeFunctionData({
        abi: resolverAbi,
        functionName: "grantSetterRoles",
        args: [setter, delegate],
      }),
    );
    assert.equal(await resourceRoles(), roleSetText);
    await assert.doesNotReject(
      canSetText(aliceResolver, "alice.secrettinder.eth", "app.endpoint"),
    );
    await assert.rejects(
      canSetText(aliceResolver, "alice.secrettinder.eth", "app.credential"),
      isExecutionRevert,
    );
    await assert.rejects(
      canSetText(bobResolver, "bob.secrettinder.eth", "app.endpoint"),
      isExecutionRevert,
    );
    await sendForkTransaction(
      encodeFunctionData({
        abi: resolverAbi,
        functionName: "revokeRoles",
        args: [endpointResource, roleSetText, delegate],
      }),
    );
    assert.equal(await resourceRoles(), 0n);
    await assert.rejects(
      canSetText(aliceResolver, "alice.secrettinder.eth", "app.endpoint"),
      isExecutionRevert,
    );
  });
});
