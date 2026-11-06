# AGENTS.md — apps/backend

Package guide for the API. Read the root `AGENTS.md` first; its approval boundaries (dependencies, deploys, pushes, CI) apply here. Reply to the user in Japanese.

## Current state

- Hono 4 template on Cloudflare Workers, run with Wrangler 4. `src/index.ts` only serves `GET /` → `"Hello Hono!"`. No planned endpoint exists yet.
- `wrangler.jsonc` still uses the template Worker name `my-app` and has no bindings. `nodejs_compat`, KV, D1, R2 and observability are commented-out examples, not decisions.
- No Workers type definitions are generated yet (`worker-configuration.d.ts` is absent), and `tsconfig.json` uses `hono/jsx`.
- zod, Vitest and a typecheck script are **not installed**. Adding any of them is a dependency change: ask first and give the reason and alternatives.
- `apps/backend/pnpm-workspace.yaml` is a template leftover. pnpm reads only the root `pnpm-workspace.yaml` (`allowBuilds:` there).

## Planned responsibility (Draft spec, not implemented)

From `specs/001-private-dating/plan.md` and `backend.md`:

- Authentication and the public registration check (Arkiv for registrations, ENSv2 for permission/credential checks).
- Search leases and candidate assignment: N live leases, at most K per person per round, deduplicated and retry-safe (FR-014).
- Ciphertext relay between devices, plus identity handoff, match lookup and date-request APIs for the AIBot (`contracts/simulation.md`).
- Participation review, notices, appeals and timed suspension/recovery (FR-013, FR-015).

Contracts to follow: `contracts/service.md`, `participation.md`, `participation-review.md`, `simulation.md`. The settlement contract (`settlement.md`) decides refunds; this API never decides refund or claim rights.

## Privacy and security boundaries

- Never receive, log or store plaintext matching attributes, preference masks or hobbies. The API relays ciphertext only, and a delivery receipt is not a match result.
- Never forward matching secrets or fund notes to the AIBot or an AI model. Only separately consented Persona/conversation data goes there.
- Never put pairs, match results, Personas or conversations in public Arkiv/Swarm records or logs.
- Validate every request body, query and param at the boundary (zod once it is approved). Use constant-time comparison for tokens and rate-limit auth and search endpoints.
- Secrets: put local values in `.dev.vars` (gitignored) and production values in `wrangler secret put`. Never commit them or hardcode them in `wrangler.jsonc` `vars`.
- Writes to external systems (Arkiv, chain, AIBot) must be idempotent. When an outcome is unknown, re-query the same operation instead of resending a new one.

## Implementation conventions

- Type bindings: after editing `wrangler.jsonc`, run `pnpm --filter backend cf-typegen`, then use `new Hono<{ Bindings: CloudflareBindings }>()`. Read bindings from `c.env`, never from `process.env`.
- Contract first: add or change endpoints in `packages/api-specs/openapi.yaml` (currently empty), then share types through `packages/shared`. `contracts/service.md` is the source of the proposed shapes.
- Expected failures return the Result shape `{ ok: true, data } | { ok: false, error }` and map to explicit HTTP status codes. Throw only for programmer errors, and log errors with the operation name and IDs (never secrets or plaintext attributes).
- Split routes by feature with `app.route()` once there is more than one area. Keep handlers under 50 lines.
- Hono, Wrangler and the Workers runtime change quickly. Check Context7 or the official docs, and load the `cloudflare:workers-best-practices` and `cloudflare:wrangler` skills before changing runtime or config behavior.

## Commands

```sh
pnpm --filter backend dev                                         # wrangler dev (local)
pnpm --filter backend cf-typegen                                  # regenerate CloudflareBindings
pnpm --filter backend exec wrangler deploy --dry-run --outdir=dist  # CI build check
```

There are no `build`, `check-types` or `test` scripts, so turbo skips this package for those tasks.

## Verify before saying "done"

1. `pnpm --filter backend exec wrangler deploy --dry-run --outdir=dist`
2. `pnpm exec biome ci apps/backend`
3. When dependencies change, keep `pnpm-lock.yaml` in sync (CI uses `--frozen-lockfile`).

## Ask first

- `pnpm --filter backend deploy` / `wrangler deploy` (real deployment), `wrangler secret put`, and creating KV/D1/R2/Queue resources.
- Renaming the Worker (`name` in `wrangler.jsonc`), because that changes the deployed service.
- Adding dependencies (zod, Arkiv SDK, viem, a test runner, and so on).
