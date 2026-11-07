# Backend (`apps/backend`)

- Hono 4 on Cloudflare Workers. `src/index.ts` has local SIWE challenge/session, private-operation and synthetic owner-only participation-review routes. This Worker is not deployed or connected to the public Vercel frontend. Many OpenAPI operations are contract-only, not implemented routes.
- `wrangler.jsonc` binds `AUTH_STORE` Durable Object for single-use challenges, sessions and synthetic review state. After changing bindings run `pnpm --filter backend cf-typegen`. Secrets belong in `.dev.vars` or Workers secrets, never `wrangler.jsonc`.
- `viem@2.57.16` and `@arkiv-network/sdk@1.0.1` are installed. Participation implementation lives in `src/participation/{ens-plan,issuer,publication}.ts`; public schemas/signature logic are in `packages/shared/src/participation/`. See `mem:participation/core` for verification boundaries.
- Scripts: `dev`, `deploy`, `cf-typegen`, `check-types`, `test`. Tests include participation and auth; `--test-concurrency=1` avoids competing local Wrangler subprocesses. CI still bundles via `wrangler deploy --dry-run`.
- `wrangler deploy` and external Arkiv/onchain writes require the authorization boundaries in root/package AGENTS and relevant skills. `workerd` native binary requires root `allowBuilds`.
- For Workers/runtime changes load `cloudflare:workers-best-practices` and `cloudflare:wrangler`; current versions and source override this memory.
