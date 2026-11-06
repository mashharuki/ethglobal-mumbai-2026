# AGENTS.md — packages/api-specs

Single source of truth for the HTTP contract between `apps/frontend`, `apps/backend`, the independent verifier and the AIBot handoff. Read the root `AGENTS.md` first; its approval boundaries apply here. Reply to the user in Japanese.

## Current state

- `openapi.yaml` is **empty (0 bytes)**. No endpoint is defined, and no app consumes this package yet (it is not listed in any app's `dependencies`).
- `package.json` is the `npm init` default: `main: index.js` (missing file), and a `test` script that exits 1. As a result, root `pnpm test` fails here. This is a known, pre-existing failure, not a regression.
- No linter, bundler or generator is installed. Biome does not validate YAML.

## Where the contract comes from

The proposed shapes live in Markdown under `specs/001-private-dating/contracts/`. Translate them; do not invent endpoints.

| Source | What goes into `openapi.yaml` |
|---|---|
| `service.md` | All `/v1` operations: auth challenges/sessions, registrations, operations, search leases + WebSocket channel, invites/decisions, deposits, and the review/appeal/block APIs |
| `participation.md`, `participation-review.md` | Credential and review schemas, states and error codes |
| `simulation.md` | `POST /simulation/identity`, `GET /matches/{matchId}`, `POST /date-requests` (AIBot handoff) |
| `settlement.md` | The deposit asset allowlist (chainId + token address for USDC/EURC) and minimal-unit decimal-string amounts |

Task T003 in `specs/001-private-dating/tasks.md` owns the initial definition, and T026 adds the AIBot operations. Do not edit `specs/` while doing this unless the user asks for specification work. If the Markdown and the YAML disagree, report it.

## Contract rules (from `service.md`)

- Use the `/v1` prefix and OpenAPI 3.1. Every operation has an `operationId` (verb+noun, camelCase), a request schema, response schemas and explicit error responses.
- **Status codes**: an accepted async write returns `202` with an `operationId` to poll; `401` unauthenticated; `403` new search with an invalid credential; `404` someone else's private resource or an unknown ID; `409` an idempotency-key conflict, stale version or wrong state; `422` an invalid value; `429` a rate or concurrency limit; `503` an external dependency is down or the credential state is unknown.
- **Idempotency**: state-changing POST/PATCH requests carry an operation ID. A same-subject, same-content replay returns the same result.
- **Amounts**: use decimal strings in minimal units, never JSON numbers. Identify a token by the `chainId` + `tokenAddress` pair, not by symbol.
- **Separate projections**: define public schemas (for example, the public registration record) separately from owner-only schemas, and never reuse an owner-only schema in a public response.
- **Never model** fields for plaintext attributes, preference masks, hobbies, per-condition match results, pair identifiers in public responses, or fund notes. Ciphertext fields are opaque base64/hex strings.
- Error bodies must not echo secrets, signatures or capability URLs.
- Name security schemes explicitly: the session cookie (HttpOnly/Secure/SameSite, SIWE-based) for browsers and the service auth for the AIBot. Public reads must not require login.

## Workflow

1. Define or change the operation here first.
2. Regenerate the client/types into `packages/shared/src/generated/` (planned: OpenAPI Generator → `client.ts`; see `packages/shared/AGENTS.md`).
3. Implement the handler in `apps/backend` and the call in `apps/frontend`.

Breaking changes (removing fields, narrowing types, renaming operations) need both apps updated in the same change.

## Verify before saying "done"

- `git diff --check -- packages/api-specs`
- Validate the YAML once a validator is approved. Until then, parse it locally, for example with `node -e "…"` and a YAML parser that is already installed, and report that no OpenAPI linter was run.
- Check that every operation in the source Markdown is present or explicitly deferred.

## Ask first

- Adding dependencies (an OpenAPI linter such as Redocly/Spectral, a generator, or a mock server). Give the reason and alternatives.
- Changing `package.json` scripts, including fixing the failing `test` script, or wiring this package into turbo tasks.
