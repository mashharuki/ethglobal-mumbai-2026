import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { participationTrustAnchor } from "shared";
import { decodeFunctionData, parseAbi } from "viem";

import {
  ensSepoliaDeployment,
  issuerResolverRoles,
  participantRegistryRoles,
  planParentRegistry,
  planParticipant,
} from "./ens-plan.ts";

const registryAbi = parseAbi([
  "function register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expiry)",
]);
const resolverAbi = parseAbi([
  "function setText(bytes name, string key, string value)",
  "function grantSetterRoles(bytes setter, address account)",
]);
const subject = "0x3333333333333333333333333333333333333333";

function makePlan(label: string) {
  return planParticipant({
    proxyLogic: "0x2222222222222222222222222222222222222222",
    registry: "0x1111111111111111111111111111111111111111",
    label,
    subject,
    expiry: 2000n,
  });
}

describe("ENS issuance call plans", () => {
  it("should attach a predicted UserRegistry to the pinned parent", () => {
    const plan = planParentRegistry(
      "0x2222222222222222222222222222222222222222",
      123n,
    );
    assert.equal(plan.deploy.to, ensSepoliaDeployment.factory);
    assert.equal(plan.attach.to, participationTrustAnchor.parentRegistry);
    assert.equal(plan.registry.length, 42);
  });

  it("should register a nontransferable participant token", () => {
    const plan = makePlan("alice");
    const decoded = decodeFunctionData({
      abi: registryAbi,
      data: plan.register.data,
    });
    assert.equal(decoded.functionName, "register");
    if (decoded.functionName === "register") {
      assert.equal(decoded.args[0], "alice");
      assert.equal(decoded.args[1], subject);
      assert.equal(decoded.args[3], plan.resolver);
      assert.equal(decoded.args[4], participantRegistryRoles);
      assert.equal(decoded.args[4], 0n);
    }
    assert.equal(issuerResolverRoles & (1n << 28n), 0n);
    assert.equal(issuerResolverRoles & (1n << 124n), 0n);
  });

  it("should grant only endpoint and key setters to the owner", () => {
    const plan = makePlan("alice");
    const grants = [plan.grantEndpoint, plan.grantKey];
    const keys = grants.map((call) => {
      const grant = decodeFunctionData({ abi: resolverAbi, data: call.data });
      assert.equal(grant.functionName, "grantSetterRoles");
      if (grant.functionName !== "grantSetterRoles")
        throw new Error("Wrong grant call");
      assert.equal(grant.args[1], subject);
      const setter = decodeFunctionData({
        abi: resolverAbi,
        data: grant.args[0],
      });
      assert.equal(setter.functionName, "setText");
      if (setter.functionName !== "setText")
        throw new Error("Wrong setter call");
      return setter.args[1];
    });
    assert.deepEqual(keys, ["app.endpoint", "app.key"]);
  });

  it("should use separate resolvers for different participant names", () => {
    assert.notEqual(makePlan("alice").resolver, makePlan("bob").resolver);
    assert.equal(makePlan("alice").resolver, makePlan("alice").resolver);
  });
});
