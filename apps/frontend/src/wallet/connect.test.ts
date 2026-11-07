/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  type AnonymousWorker,
  connectSepoliaWallet,
  readSepoliaBlock,
} from "./connect.ts";

const address = "0xfb6DF0D12052a1c8E58920654D44015C61552E57";

describe("Sepolia wallet connection", () => {
  it("should request an account only after checking Sepolia", async () => {
    const methods: string[] = [];
    const result = await connectSepoliaWallet({
      async request({ method }) {
        methods.push(method);
        return method === "eth_chainId" ? "0xaa36a7" : [address];
      },
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.data.address, address);
    assert.deepEqual(methods, ["eth_chainId", "eth_requestAccounts"]);
  });

  it("should fail closed without provider, wrong chain, or account", async () => {
    assert.deepEqual(await connectSepoliaWallet(null), {
      ok: false,
      error: "PROVIDER_UNAVAILABLE",
    });
    const methods: string[] = [];
    const wrong = await connectSepoliaWallet({
      async request({ method }) {
        methods.push(method);
        return "0x1";
      },
    });
    assert.deepEqual(wrong, { ok: false, error: "WRONG_CHAIN" });
    assert.deepEqual(methods, ["eth_chainId"]);
    const empty = await connectSepoliaWallet({
      async request({ method }) {
        return method === "eth_chainId" ? "0xaa36a7" : [];
      },
    });
    assert.deepEqual(empty, { ok: false, error: "ACCOUNT_UNAVAILABLE" });
  });
});

describe("anonymous Sepolia reads", () => {
  it("should never fall back to the wallet or direct fetch", async () => {
    assert.deepEqual(await readSepoliaBlock(null), {
      ok: false,
      error: "ANON_RPC_UNAVAILABLE",
    });
  });

  it("should route both chain and block reads through the injected worker", async () => {
    const methods: string[] = [];
    const worker: AnonymousWorker = {
      async fetch(url, init) {
        assert.equal(url, "https://ethereum-sepolia-rpc.publicnode.com");
        assert.equal(init.cache, "no-store");
        const body = JSON.parse(String(init.body)) as { method: string };
        methods.push(body.method);
        return Response.json({
          result: body.method === "eth_chainId" ? "0xaa36a7" : "0xb85710",
        });
      },
    };
    const result = await readSepoliaBlock(worker);
    assert.deepEqual(result, {
      ok: true,
      data: {
        chainId: 11155111,
        blockNumber: 0xb85710n,
        transport: "anon-rpc",
      },
    });
    assert.deepEqual(methods, ["eth_chainId", "eth_blockNumber"]);
  });

  it("should reject wrong-chain and failed worker responses", async () => {
    let calls = 0;
    const wrong = await readSepoliaBlock({
      async fetch() {
        calls += 1;
        return Response.json({ result: "0x1" });
      },
    });
    assert.deepEqual(wrong, { ok: false, error: "WRONG_CHAIN" });
    assert.equal(calls, 1);
    const failed = await readSepoliaBlock({
      async fetch() {
        throw new Error("worker unavailable");
      },
    });
    assert.deepEqual(failed, { ok: false, error: "READ_FAILED" });
    const malformed = await readSepoliaBlock({
      async fetch() {
        return Response.json({ result: "not hex" });
      },
    });
    assert.deepEqual(malformed, { ok: false, error: "INVALID_RESPONSE" });
  });
});
