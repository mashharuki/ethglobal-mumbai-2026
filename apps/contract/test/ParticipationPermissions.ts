import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BaseError,
  createPublicClient,
  ExecutionRevertedError,
  encodeFunctionData,
  http,
  keccak256,
  parseAbi,
  stringToHex,
  toHex,
} from "viem";
import { packetToBytes } from "viem/ens";

const rpcUrl = process.env.SEPOLIA_RPC_URL;
const runLive = process.env.RUN_ENS_PERMISSION_TESTS === "1";
const blockNumber = 12078653n;
const registry = "0x8A189F48764C466972c0244C5671B4461C958E8C";
const alice = "0xfb6DF0D12052a1c8E58920654D44015C61552E57";
const bob = "0xD1D13C313FfBB0dD00898D8c705794D082Dc388e";
const issuer = "0xcA341CE4902756bF9e96e145014DD0aB36A0Fe8E";
const aliceResolver = "0x28a0549e48190d69Ae8Bf6046713F766B20A5598";
const aliceResource =
  70564938991660933374592024341600875602376452319261984317470407481572850663424n;
const roleSetText = 1n << 4n;
const accessAbi = parseAbi([
  "function roles(uint256 resource, address account) view returns (uint256)",
]);
const textAbi = parseAbi([
  "function setText(bytes name, string key, string value)",
]);
const registryAbi = parseAbi([
  "function setResolver(uint256 anyId, address resolver)",
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)",
  "function grantRoles(uint256 anyId, uint256 roleBitmap, address account) returns (bool)",
]);

const client = createPublicClient({
  transport: http(rpcUrl ?? "https://ethereum-sepolia-rpc.publicnode.com", {
    retryCount: 0,
    timeout: 10_000,
  }),
});

function textResource(key: string): bigint {
  return BigInt(keccak256(stringToHex(key)));
}

async function readRoles(
  address: `0x${string}`,
  resource: bigint,
  account: `0x${string}`,
): Promise<bigint> {
  return client.readContract({
    address,
    abi: accessAbi,
    functionName: "roles",
    args: [resource, account],
    blockNumber,
  });
}

async function simulateText(
  account: `0x${string}`,
  key: string,
): Promise<void> {
  const data = encodeFunctionData({
    abi: textAbi,
    functionName: "setText",
    args: [toHex(packetToBytes("alice.secrettinder.eth")), key, "test"],
  });
  await client.call({ account, to: aliceResolver, data, blockNumber });
}

async function simulateRegistry(
  functionName: "setResolver" | "safeTransferFrom" | "grantRoles",
): Promise<void> {
  const args = {
    setResolver: [aliceResource, bob],
    safeTransferFrom: [alice, bob, aliceResource, 1n, "0x"],
    grantRoles: [aliceResource, 1n << 24n, alice],
  } as const;
  const data = encodeFunctionData({
    abi: registryAbi,
    functionName,
    args: args[functionName],
  });
  await client.call({ account: alice, to: registry, data, blockNumber });
}

function isExecutionRevert(error: unknown): boolean {
  return (
    error instanceof BaseError &&
    error.walk((cause) => cause instanceof ExecutionRevertedError) instanceof
      ExecutionRevertedError
  );
}

describe("ENSv2 participation permissions on pinned Sepolia block", {
  skip: !runLive,
}, () => {
  it("should allow Alice to update only her endpoint and key", async () => {
    assert.equal(await readRoles(registry, 0n, alice), 0n);
    assert.equal(await readRoles(registry, aliceResource, alice), 0n);
    assert.equal(await readRoles(aliceResolver, 0n, alice), 0n);
    for (const key of ["app.endpoint", "app.key"]) {
      assert.equal(
        await readRoles(aliceResolver, textResource(key), alice),
        roleSetText,
      );
      await assert.doesNotReject(simulateText(alice, key));
    }
  });

  it("should reject Alice and Bob updating Alice's credential key", async () => {
    assert.equal(
      await readRoles(aliceResolver, textResource("app.credential"), alice),
      0n,
    );
    assert.equal(
      await readRoles(aliceResolver, 0n, issuer),
      roleSetText | (roleSetText << 128n),
    );
    await assert.rejects(
      simulateText(alice, "app.credential"),
      isExecutionRevert,
    );
    await assert.rejects(
      simulateText(bob, "app.credential"),
      isExecutionRevert,
    );
  });

  it("should reject Bob updating Alice's endpoint", async () => {
    assert.equal(
      await readRoles(aliceResolver, textResource("app.endpoint"), bob),
      0n,
    );
    await assert.rejects(simulateText(bob, "app.endpoint"), isExecutionRevert);
  });

  it("should reject Alice replacing the resolver, transferring or granting admin rights", async () => {
    for (const operation of [
      "setResolver",
      "safeTransferFrom",
      "grantRoles",
    ] as const) {
      await assert.rejects(simulateRegistry(operation), isExecutionRevert);
    }
  });
});
