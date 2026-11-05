# Tech stack

- Node 24 (CI), TypeScript 7.x, ESM everywhere (`"type": "module"`).
- pnpm 11.24.0 (pinned via `packageManager` + `devEngines`); workspaces `apps/*`, `packages/*` (submodule is NOT a workspace).
- pnpm 11 blocks dependency build scripts: whitelist in root `pnpm-workspace.yaml` `allowBuilds:` (`name: true`). On failure pnpm writes placeholder keys there — edit them, don't append (duplicate key breaks YAML). `apps/backend/pnpm-workspace.yaml` is a template leftover; only the root one is honored.
- `pnpm run <script>` auto-runs `pnpm install` when deps are stale; a broken install therefore blocks every turbo task.
- Turborepo 2.x: root scripts `build|dev|check-types|lint|test` → `turbo run`. `turbo.json`: `build` dependsOn `^build`, outputs `dist/**`, `.next/**`; `check-types` dependsOn `^check-types`; `test` dependsOn `^build`; `dev` persistent+uncached. A package participates only if it defines that script. Bundled docs: `node_modules/turbo/docs/README.md`.
- Root devDeps: Biome 2.5.10 (format+lint, double quotes, space indent), knip 6, jscpd 5, typescript, @types/node.
- `apps/frontend` lints with oxlint (not Biome) — Biome still formats/lints it at root level.
- Tests: Vitest intended (`.claude/rules/testing.md`), not installed. Validation: zod at boundaries (not installed).
- Native binaries (`workerd`, `@biomejs/cli-*`, `@turbo/*`) come from optional platform packages; flaky network leaves dangling symlinks → `MODULE_NOT_FOUND`/postinstall failure. Fix: rerun `pnpm install`.
