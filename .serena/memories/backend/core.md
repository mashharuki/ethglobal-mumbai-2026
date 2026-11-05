# Backend (`apps/backend`)

- Hono 4 on Cloudflare Workers, entry `src/index.ts` (template: `GET /` → "Hello Hono!").
- `wrangler.jsonc`: worker name still template `my-app`; bindings (KV/R2/D1/AI/vars) all commented out. After adding bindings run `pnpm --filter backend cf-typegen` (generates `CloudflareBindings` env interface) and type Hono as `new Hono<{ Bindings: CloudflareBindings }>()`.
- Scripts: `dev` (wrangler dev), `deploy` (wrangler deploy --minify), `cf-typegen`. No `build`/`check-types`/`test` scripts yet → turbo skips backend for those tasks; CI builds it via `wrangler deploy --dry-run`.
- Depends on `workerd` native binary (allowed in root `allowBuilds`).
- Skills: `cloudflare:workers-best-practices`, `cloudflare:wrangler`, `cloudflare:durable-objects` etc.
- Secrets: `.dev.vars` / `wrangler secret put`, never in `wrangler.jsonc`.
