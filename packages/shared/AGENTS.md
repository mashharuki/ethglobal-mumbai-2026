# AGENTS.md — packages/shared

Shared TypeScript code for `apps/frontend`, `apps/backend` and the planned independent verifier `scripts/verify-participation.ts`. Read the root `AGENTS.md` first; its approval boundaries apply here. Reply to the user in Japanese.

## Current state

- The package exports the participation schema and pure signing/digest helpers from `src/index.ts`. `zod` and `viem` are approved dependencies, and `tsconfig.json` plus `check-types`/`test` scripts are configured.
- The backend's participation preparation code consumes this package. The ENS participant Registry, issuer write flow, and independent verifier remain unimplemented. The Sepolia parent snapshot is evidence for the parent name only, not an active participant trust configuration.

## Planned contents (from `specs/001-private-dating/tasks.md`)

| Path | Task | Content |
|---|---|---|
| `src/generated/client.ts` | T003 | Client/types generated from `packages/api-specs/openapi.yaml` (OpenAPI Generator planned). **Never hand-edit**; regenerate it. |
| `src/participation/schema.ts`, `credential.ts` | T037 | Participation schema, EIP-712 signing/digest format, states/errors, permission table, and the observed parent fixture (`contracts/participation.md`) |
| `src/simulation/contract.ts` | T026 | AIBot handoff contract: the HMAC format, expiry/audience and consent states (`contracts/simulation.md`) |

Create the remaining planned files when the matching task is authorized, and keep their names aligned with `tasks.md`.

## Design rules

- **Runtime-agnostic**: code here runs in the browser, on Cloudflare Workers and in Node 24. Do not use Node-only modules (`fs`, `path`, `Buffer`), DOM-only globals or `process.env`. Use Web standard APIs (`crypto.subtle`, `TextEncoder`, `fetch`).
- **No secrets and no side effects**: no keys, RPC URLs with access keys, network calls at import time, or global state. The independent verifier must stay independent of the BFF. Share only schemas, fixtures and pure functions, never "already verified" flags.
- **Contract, not app logic**: put HTTP shapes in OpenAPI first and generate them. Hand-written types here are for non-HTTP contracts (credential formats, digests, AIBot handoff) and pure helpers shared by more than one consumer. App-specific code stays in its app.
- **Privacy**: never define a type that places plaintext attributes, preference masks, hobbies or fund notes in an API/public payload. Model owner-only and public projections as separate types.
- Use the Result type `{ ok: true, data } | { ok: false, error }` for expected validation failures. Prefer discriminated unions for states, and `satisfies` over `as`. Exported functions need explicit return types.
- Runtime validation uses zod. Export each schema and its inferred type together so the frontend and backend validate identically.
- Do not add circular imports and do not import from `apps/*`.

## Consumers

When a frontend or backend consumer is implemented, add `"shared": "workspace:*"` to that package and keep `pnpm-lock.yaml` in sync. The signature helper checks the record's structure and signature; consumers must also verify the pinned issuer, current ENS Registry and issuance generation, Arkiv reference/digest, status, and expiry before accepting participation.

## Tests

Node 24's test runner is used. Colocate `foo.test.ts` tests named `it("should <x> when <y>")`. Cover schema accept/reject cases with fixtures and synthetic credentials, never real signing keys.

## Verify before saying "done"

- `pnpm exec biome ci packages/shared`
- Once configured: `pnpm --filter shared check-types` and `pnpm --filter shared test`
- Build both consumers when exports change: `pnpm --filter frontend build` and `pnpm --filter backend exec wrangler deploy --dry-run --outdir=dist`

## Ask first

- Adding dependencies (zod, a generator, Vitest, crypto libraries) and changing `package.json`, `tsconfig` or turbo wiring.
