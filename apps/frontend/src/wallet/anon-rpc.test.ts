/// <reference types="node" />

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createSpecifierBootstrapProvider,
  startSepoliaAnonRpc,
} from "./anon-rpc.ts";

const specifier = "0x35133267A8F7EC35046a83DCA0f4Ca8A6e1b7A9A";

describe("Anon-RPC Sepolia bootstrap", () => {
  it("should read only the Nox specifier before anonymous traffic", async () => {
    const calls: unknown[] = [];
    const provider = createSpecifierBootstrapProvider(async (url, init) => {
      assert.equal(url, "https://ethereum-sepolia-rpc.publicnode.com");
      calls.push(JSON.parse(String(init?.body)));
      return Response.json({ result: "0x1234" });
    });
    const result = await provider.request({
      method: "eth_call",
      params: [{ to: specifier, data: "0x3898587d" }, "latest"],
    });
    const resolvers = await provider.request({
      method: "eth_call",
      params: [{ to: specifier, data: "0x1c67ff29" }, "latest"],
    });
    assert.equal(result, "0x1234");
    assert.equal(resolvers, "0x1234");
    assert.equal(calls.length, 2);
  });

  it("should reject unrelated bootstrap calls without sending requests", async () => {
    let count = 0;
    const provider = createSpecifierBootstrapProvider(async () => {
      count += 1;
      return Response.json({ result: "0x" });
    });
    for (const input of [
      { method: "eth_getBalance", params: [specifier, "latest"] },
      {
        method: "eth_call",
        params: [{ to: specifier, data: "0x12345678" }, "latest"],
      },
      {
        method: "eth_call",
        params: [
          {
            to: "0x0000000000000000000000000000000000000001",
            data: "0x3898587d",
          },
          "latest",
        ],
      },
    ]) {
      await assert.rejects(provider.request(input));
    }
    assert.equal(count, 0);
  });

  it("should reject invalid bootstrap RPC output", async () => {
    const provider = createSpecifierBootstrapProvider(async () =>
      Response.json({ error: { message: "RPC unavailable" } }),
    );
    await assert.rejects(
      provider.request({
        method: "eth_call",
        params: [{ to: specifier, data: "0x3898587d" }, "latest"],
      }),
    );
  });

  it("should report unavailable outside a browser", async () => {
    assert.deepEqual(await startSepoliaAnonRpc(), {
      ok: false,
      error: "BROWSER_UNAVAILABLE",
    });
  });
});
