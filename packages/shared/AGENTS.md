# AGENTS.md — packages/shared

Shared TypeScript code for `apps/frontend`, `apps/backend` and the planned independent verifier `scripts/verify-participation.ts`. Read the root `AGENTS.md` first; its approval boundaries apply here. Reply to the user in Japanese.

## Current state

- The package is **empty**: only `package.json` exists, with no `src/`, `tsconfig.json` or exports. No app depends on it yet.
- `package.json` is the `npm init` default: `main: index.js` (missing file), and a `test` script that exits 1. As a result, root `pnpm test` fails here. This is a known, pre-existing failure, not a regression.

## Planned contents (from `specs/001-private-dating/tasks.md`)

| Path | Task | Content |
|---|---|---|
| `src/generated/client.ts` | T003 | Client/types generated from `packages/api-specs/openapi.yaml` (OpenAPI Generator planned). **Never hand-edit**; regenerate it. |
| `src/participation/schema.ts` | T037 | Participation credential schema, signature/digest formats, states/errors, the permission table, and the trusted namespace/issuer (`contracts/participation.md`) |
| `src/simulation/contract.ts` | T026 | AIBot handoff contract: the HMAC format, expiry/audience and consent states (`contracts/simulation.md`) |

Planned only. Create these files when the matching task is authorized, and keep their names aligned with `tasks.md`.

## Design rules

- **Runtime-agnostic**: code here runs in the browser, on Cloudflare Workers and in Node 24. Do not use Node-only modules (`fs`, `path`, `Buffer`), DOM-only globals or `process.env`. Use Web standard APIs (`crypto.subtle`, `TextEncoder`, `fetch`).
- **No secrets and no side effects**: no keys, RPC URLs with access keys, network calls at import time, or global state. The independent verifier must stay independent of the BFF. Share only schemas, fixtures and pure functions, never "already verified" flags.
- **Contract, not app logic**: put HTTP shapes in OpenAPI first and generate them. Hand-written types here are for non-HTTP contracts (credential formats, digests, AIBot handoff) and pure helpers shared by more than one consumer. App-specific code stays in its app.
- **Privacy**: never define a type that places plaintext attributes, preference masks, hobbies or fund notes in an API/public payload. Model owner-only and public projections as separate types.
- Use the Result type `{ ok: true, data } | { ok: false, error }` for expected validation failures. Prefer discriminated unions for states, and `satisfies` over `as`. Exported functions need explicit return types.
- Runtime validation uses zod once it is approved (it is not installed). Export the schema and its inferred type together so the frontend and backend validate identically.
- Do not add circular imports and do not import from `apps/*`.

## Setting up the package (needs approval)

Before the first source file, the package needs `src/index.ts` (or subpath `exports`), a `tsconfig.json`, a fixed `main`/`exports`, a `check-types` script and a real or removed `test` script. Consumers then add `"shared": "workspace:*"`. These are configuration and dependency changes: propose them and get approval first. Keep `pnpm-lock.yaml` in sync.

## Tests

Vitest is not configured. Once approved, colocate `foo.test.ts` tests named `it("should <x> when <y>")`. Cover schema accept/reject cases with fixtures (for example `specs/001-private-dating/fixtures/participation.json`, planned in T037 and not yet created), never with real credentials.

## Verify before saying "done"

- `pnpm exec biome ci packages/shared`
- Once configured: `pnpm --filter shared check-types` and `pnpm --filter shared test`
- Build both consumers when exports change: `pnpm --filter frontend build` and `pnpm --filter backend exec wrangler deploy --dry-run --outdir=dist`

## Ask first

- Adding dependencies (zod, a generator, Vitest, crypto libraries) and changing `package.json`, `tsconfig` or turbo wiring.
