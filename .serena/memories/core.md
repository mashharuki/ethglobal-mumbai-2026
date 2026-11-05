# Core

ETHGlobal Mumbai 2026 hackathon repo. Product idea still being shaped (as of 2026-11-06); apps are template-level. Spec Kit work intentionally NOT started — don't run `speckit-*` unless asked.

## Source map
- `apps/frontend` — Vite + React 19 SPA. Details: `mem:frontend/core`.
- `apps/backend` — Hono on Cloudflare Workers (wrangler). Details: `mem:backend/core`.
- `packages/api-specs` — `openapi.yaml` (empty) = intended API contract between frontend/backend.
- `packages/shared` — shared TS code (empty package, no scripts yet).
- `ETH-Global-Mumbai-2026-P/` — **git submodule**, Python runtime split out (separate repo/owner). Details: `mem:python_runtime/core`.
- `.claude/` — rules (`rules/*.md`, authoritative), hooks, settings; `.claude/skills` and `.agents/skills` are mirrored skill copies (lism-css, turborepo, vercel react, speckit) tracked by `skills-lock.json`.
- `.specify/` — Spec Kit scaffolding; `constitution.md` still template.
- `.github/workflows/ci.yml` — CI (see `mem:task_completion`).
- `AGENTS.md` — agent entry doc (`CLAUDE.md` just includes it).

## Invariants / gotchas
- TS monorepo is pnpm + Turborepo; Python runtime lives only in the submodule — never add Python to `apps/`/`packages/` or JS tooling to the submodule.
- Biome must not lint the submodule; `knip.json` still lists non-existent workspaces (`apps/regatta-web`, `apps/cdk`) copied from another project.
- Claude hooks `format-on-save.sh`/`lint-on-save.sh` call Prettier/ESLint, which this repo doesn't use (effectively no-ops).

Further memories:
- toolchain versions, pnpm 11 build-script whitelist, turbo task graph: `mem:tech_stack`
- dev/lint/format/submodule commands and Darwin shell differences: `mem:suggested_commands`
- code style, naming, git/commit rules: `mem:conventions`
- checks to run before declaring a task done (mirrors CI): `mem:task_completion`
