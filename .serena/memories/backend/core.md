# Backend (`apps/backend`)

- Hono 4 on Cloudflare Workers; `src/index.ts` still serves template `GET /` → "Hello Hono!". No product API route is wired yet.
- `wrangler.jsonc` still uses template worker name `my-app`; bindings are commented out. After changing bindings run `pnpm --filter backend cf-typegen`. Secrets belong in `.dev.vars` or Workers secrets, never `wrangler.jsonc`.
- `viem@2.57.16` and `@arkiv-network/sdk@1.0.1` are installed. Participation implementation lives in `src/participation/{ens-plan,issuer,publication}.ts`; public schemas/signature logic are in `packages/shared/src/participation/`. See `mem:participation/core` for verification boundaries.
- Scripts: `dev`, `deploy`, `cf-typegen`, `check-types`, `test`. Tests use `node --test src/participation/*.test.ts`; CI still bundles via `wrangler deploy --dry-run`.
- `wrangler deploy` and external Arkiv/onchain writes require the authorization boundaries in root/package AGENTS and relevant skills. `workerd` native binary requires root `allowBuilds`.
- For Workers/runtime changes load `cloudflare:workers-best-practices` and `cloudflare:wrangler`; current versions and source override this memory.