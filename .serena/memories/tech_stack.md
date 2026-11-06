# Tech stack

- Node 24 in CI, ESM packages. Root/frontend TypeScript 7; contract TypeScript 6. Read manifests/lockfile for exact installed versions.
- pnpm 11.24.0 pinned via `packageManager` + `devEngines`; workspaces `apps/*`, `packages/*`. The Next.js AIBot submodule is an independent npm project, not a parent workspace.
- pnpm build-script allowlist is root `pnpm-workspace.yaml` `allowBuilds`. Edit existing keys rather than creating duplicates. Backend's nested workspace YAML is a template leftover.
- Stale dependencies may trigger installation during pnpm scripts. Native optional packages (workerd, Biome, Turbo) can be missing after failed installs; distinguish installation failures from code failures.
- Turborepo 2: build/check-types depend on corresponding upstream tasks; test depends on upstream build; dev persistent + uncached. Packages only participate when they define the script.
- Build cache outputs include `dist/**`, `.next/**`, `artifacts/**`, `cache/**`, but not Void's `.cloudflare/output/**`. Read installed `node_modules/turbo/docs/README.md` before an authorized Turbo config change.
- Root Biome 2.5.10; frontend oxlint; Solidity Prettier. `pnpm format` is formatting only, not lint autofix.
- Frontend: React/Vite + lism-css, Void plugin and PWA. `mem:frontend/core`.
- Backend: Hono/Workers; no build/check-types/test scripts. `mem:backend/core`.
- Contracts: Hardhat/viem with Solidity + node:test tests, experimental slang profile for local work. `mem:contract/core`.
- Vitest/zod are intended app conventions, not currently configured app infrastructure.
- `api-specs` / `shared` test scripts intentionally exit 1 as package scaffolding.
- knip still references obsolete apps/regatta-web and apps/cdk. Biome excludes .claude/.serena/.codegraph, but checks .agents skill scripts; keep imported tooling failures distinct from app failures.
