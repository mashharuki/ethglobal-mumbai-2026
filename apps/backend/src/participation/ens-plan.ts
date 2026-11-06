import {
  type CredentialReference,
  credentialReferenceSchema,
  participationTrustAnchor,
} from "shared";
import {
  type Address,
  concat,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  getCreate2Address,
  type Hex,
  isAddressEqual,
  keccak256,
  namehash,
  parseAbi,
  stringToHex,
  toHex,
} from "viem";
import { normalize, packetToBytes } from "viem/ens";

export const ensSepoliaDeployment = {
  factory: "0xda70306c98e97ece36f997a21368e53298572991",
  userRegistryImplementation: "0x9bd8a88719068d09ecee662f36c0e3856708366a",
  resolverImplementation: "0x115eb53f0c60696633855f90b138178fb40b2b2c",
} as const;

const factoryAbi = parseAbi([
  "function deployProxy(address implementation, uint256 salt, bytes data)",
]);
const registryInitAbi = parseAbi([
  "function initialize((address account, uint256 roleBitmap)[] grants)",
]);
const resolverInitAbi = parseAbi([
  "function initialize((address account, uint256 roleBitmap)[] grants, bytes[] calls)",
]);
const registryAbi = parseAbi([
  "function setSubregistry(uint256 anyId, address registry)",
  "function register(string label, address owner, address registry, address resolver, uint256 roleBitmap, uint64 expiry)",
]);
const resolverAbi = parseAbi([
  "function setText(bytes name, string key, string value)",
  "function grantSetterRoles(bytes setter, address account)",
]);

const roleRegistrar = 1n << 0n;
const roleUnregister = 1n << 12n;
const roleRenew = 1n << 16n;
const roleSetResolver = 1n << 24n;
const roleSetText = 1n << 4n;
const roleSetTextAdmin = roleSetText << 128n;

export const issuerRegistryRoles =
  roleRegistrar | roleUnregister | roleRenew | roleSetResolver;
export const issuerResolverRoles = roleSetText | roleSetTextAdmin;
export const participantRegistryRoles = 0n;

export type PlannedEnsCall = { to: Address; data: Hex };

function getSalt(kind: string, identity: Hex, version: bigint): bigint {
  return BigInt(
    keccak256(
      encodeAbiParameters(
        [{ type: "bytes32" }, { type: "bytes32" }, { type: "uint256" }],
        [keccak256(stringToHex(kind)), identity, version],
      ),
    ),
  );
}

function predictProxyAddress(
  proxyLogic: Address,
  deployer: Address,
  salt: bigint,
): Address {
  const outerSalt = keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }],
      [deployer, salt],
    ),
  );
  const initCode = concat([
    "0x3d604d80600a3d3981f3363d3d373d3d3d363d73",
    proxyLogic,
    "0x5af43d82803e903d91602b57fd5bf3",
    outerSalt,
  ]);
  return getCreate2Address({
    from: ensSepoliaDeployment.factory,
    salt: outerSalt,
    bytecodeHash: keccak256(initCode),
  });
}

function deployProxy(
  implementation: Address,
  salt: bigint,
  initData: Hex,
): PlannedEnsCall {
  return {
    to: ensSepoliaDeployment.factory,
    data: encodeFunctionData({
      abi: factoryAbi,
      functionName: "deployProxy",
      args: [implementation, salt, initData],
    }),
  };
}

export function planParentRegistry(
  proxyLogicValue: string,
  parentTokenId: bigint,
): { registry: Address; deploy: PlannedEnsCall; attach: PlannedEnsCall } {
  const issuer = getAddress(participationTrustAnchor.issuer);
  const proxyLogic = getAddress(proxyLogicValue);
  const salt = getSalt(
    "UserRegistry",
    namehash(participationTrustAnchor.namespace),
    0n,
  );
  const initData = encodeFunctionData({
    abi: registryInitAbi,
    functionName: "initialize",
    args: [[{ account: issuer, roleBitmap: issuerRegistryRoles }]],
  });
  const registry = predictProxyAddress(proxyLogic, issuer, salt);
  return {
    registry,
    deploy: deployProxy(
      ensSepoliaDeployment.userRegistryImplementation,
      salt,
      initData,
    ),
    attach: {
      to: participationTrustAnchor.parentRegistry,
      data: encodeFunctionData({
        abi: registryAbi,
        functionName: "setSubregistry",
        args: [parentTokenId, registry],
      }),
    },
  };
}

export function planParticipant(input: {
  proxyLogic: string;
  registry: string;
  label: string;
  subject: string;
  expiry: bigint;
  resolverVersion?: bigint;
}): {
  resolver: Address;
  deploy: PlannedEnsCall;
  register: PlannedEnsCall;
  grantEndpoint: PlannedEnsCall;
  grantKey: PlannedEnsCall;
} {
  const label = normalize(input.label);
  if (label !== input.label || label.includes("."))
    throw new Error("Invalid participant label");
  if (input.expiry <= 0n || input.expiry > (1n << 64n) - 1n)
    throw new Error("Invalid expiry");
  const issuer = getAddress(participationTrustAnchor.issuer);
  const subject = getAddress(input.subject);
  if (isAddressEqual(issuer, subject))
    throw new Error("Issuer cannot be a participant");
  const registry = getAddress(input.registry);
  const dnsName = `${label}.${participationTrustAnchor.namespace}`;
  const salt = getSalt(
    "SecretTinderResolver",
    namehash(dnsName),
    input.resolverVersion ?? 0n,
  );
  const resolver = predictProxyAddress(
    getAddress(input.proxyLogic),
    issuer,
    salt,
  );
  const initData = encodeFunctionData({
    abi: resolverInitAbi,
    functionName: "initialize",
    args: [[{ account: issuer, roleBitmap: issuerResolverRoles }], []],
  });
  return {
    resolver,
    deploy: deployProxy(
      ensSepoliaDeployment.resolverImplementation,
      salt,
      initData,
    ),
    register: {
      to: registry,
      data: encodeFunctionData({
        abi: registryAbi,
        functionName: "register",
        args: [
          label,
          subject,
          "0x0000000000000000000000000000000000000000",
          resolver,
          participantRegistryRoles,
          input.expiry,
        ],
      }),
    },
    grantEndpoint: planTextGrant(resolver, dnsName, "app.endpoint", subject),
    grantKey: planTextGrant(resolver, dnsName, "app.key", subject),
  };
}

export function planTextGrant(
  resolver: Address,
  dnsName: string,
  key: "app.endpoint" | "app.key",
  account: Address,
): PlannedEnsCall {
  const setter = encodeFunctionData({
    abi: resolverAbi,
    functionName: "setText",
    args: [toHex(packetToBytes(normalize(dnsName))), key, ""],
  });
  return {
    to: resolver,
    data: encodeFunctionData({
      abi: resolverAbi,
      functionName: "grantSetterRoles",
      args: [setter, account],
    }),
  };
}

export function planCredentialReferenceUpdate(
  resolver: Address,
  dnsName: string,
  reference: CredentialReference,
): PlannedEnsCall {
  const referenceJson = JSON.stringify(
    credentialReferenceSchema.parse(reference),
  );
  return {
    to: resolver,
    data: encodeFunctionData({
      abi: resolverAbi,
      functionName: "setText",
      args: [
        toHex(packetToBytes(normalize(dnsName))),
        "app.credential",
        referenceJson,
      ],
    }),
  };
}
