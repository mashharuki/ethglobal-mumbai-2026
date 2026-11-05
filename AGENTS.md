# AGENTS.md

Guide for AI coding agents working in this repository. Read this first, then follow the linked rules.
Always reply to the user in **Japanese**.

## Project status

- Hackathon project for **ETHGlobal Mumbai 2026**.
- The product idea is **still being explored**. Apps are template-level; don't invent product features or domain models the user hasn't asked for.
- **Do not start Spec Kit work** (`speckit-*` skills, `.specify/`) unless the user explicitly asks for it.

## Repository map

| Path | What it is | Stack |
|---|---|---|
| `apps/frontend` | Web UI (Vite template) | React 19, Vite 8, TypeScript 7, lism-css, oxlint |
| `apps/backend` | API (Hono template) | Hono 4 on Cloudflare Workers (wrangler) |
| `packages/api-specs` | API contract (`openapi.yaml`, empty for now) | OpenAPI |
| `packages/shared` | Shared TS code (empty for now) | TypeScript |
| `ETH-Global-Mumbai-2026-P/` | **Python runtime (git submodule)** | Python, see below |
| `.claude/rules/` | Authoritative coding / git / testing / security rules | — |
| `.claude/skills/`, `.agents/skills/` | Project skills (same set, mirrored) | — |

Tooling: pnpm 11 workspaces (`apps/*`, `packages/*`) + Turborepo 2 + Biome 2.5 + knip + jscpd. Node 24.

## Python runtime submodule: `ETH-Global-Mumbai-2026-P/`

Some runtime parts are implemented in **Python** and live in a separate repository, mounted here as a git submodule:
`https://github.com/Jun0908/ETH-Global-Mumbai-2026-P` (owned by a teammate).

- It is **not** part of the pnpm workspace, Turborepo, or Biome. Never apply JS tooling there, and never add Python code under `apps/` or `packages/`.
- Its plan lives in `ETH-Global-Mumbai-2026-P/Task.md` (task IDs like `T01.01`) and the human setup steps in `SETUP.md`. These are the teammate's plan, not this repo's spec.
- To change it: commit and push **inside the submodule first** (`git -C ETH-Global-Mumbai-2026-P ...`), then commit the updated submodule pointer in this repo. Ask before pushing to the teammate's repo.
- After a fresh clone: `git submodule update --init --recursive`.
- Its `.env` holds secrets. Never read, print, or commit it.

## Commands

```sh
pnpm install                       # install all workspaces
pnpm dev                           # turbo run dev (all apps)
pnpm build | check-types | lint | test   # turbo run <task>
pnpm turbo run <task> --filter=frontend  # one package
pnpm format                        # biome check --write .
pnpm exec biome ci .               # CI-equivalent format+lint check
pnpm exec knip                     # unused files/exports/deps
pnpm --filter backend dev          # wrangler dev
pnpm --filter backend cf-typegen   # regenerate CloudflareBindings types after editing wrangler.jsonc
```

A package only runs a turbo task if it defines that script in its `package.json`. Backend currently has no `build`, `check-types` or `test` script.

## Verify before saying "done"

Run the checks that CI runs (`.github/workflows/ci.yml`) for whatever you touched:

1. `pnpm exec biome ci .`
2. Frontend: `pnpm --filter frontend lint && pnpm --filter frontend build`
3. Backend: `pnpm --filter backend exec wrangler deploy --dry-run --outdir=dist`
4. Keep `pnpm-lock.yaml` in sync (CI uses `--frozen-lockfile`).

Report failures with the actual output. Never claim success without running the checks.

## Conventions (summary; full rules in `.claude/rules/`)

- **Code style** (`code-style.md`): `const` only, early returns, functions under 50 lines, `is/has/should` booleans, verb+noun function names, explicit return types on exports, `unknown` over `any`, `satisfies` over `as`, Result type `{ ok: true, data } | { ok: false, error }` for expected failures, imports ordered external → internal → relative.
- **Formatting**: Biome (2-space indent, double quotes). Run `pnpm format` after editing; template files may still use single quotes.
- **Testing** (`testing.md`): Vitest, `foo.test.ts` next to the source, `it('should <x> when <y>')`.
- **Security** (`security.md`): zod validation at boundaries, no hardcoded secrets, Workers secrets via `.dev.vars` / `wrangler secret put`.
- **Git** (`git-workflow.md`): branches `feat/<id>-<desc>` / `fix/<id>-<desc>`, Conventional Commits in imperative mood, small PRs. Stage explicit paths, not `git add -A`; parallel sessions may have uncommitted work.

## Boundaries

- **Always**: keep frontend/backend contracts in `packages/api-specs/openapi.yaml`; put shared types in `packages/shared`; use `git -C <path>` instead of `cd` in shell commands.
- **Ask first**: adding dependencies (explain why and the alternatives), changing `turbo.json` / CI / `pnpm-workspace.yaml`, deploying (`wrangler deploy`), pushing, anything in the submodule.
- **Never**: commit secrets or `.env*`; push to `main` directly; force-push; run destructive git commands; edit `.github/workflows/**` without asking.

## Skills and MCP to use

- UI and styling: `lism-css-guide` (implement), `lism-mockup-guide` (mockups), `lism-css-refactor` (only when asked), `vercel-react-best-practices`, `vercel-composition-patterns`. MCP: `lism-css`.
- Workers / Hono: `cloudflare:workers-best-practices`, `cloudflare:wrangler`.
- Monorepo and turbo: the `turborepo` skill. Read `node_modules/turbo/docs/README.md` (matches the installed version) before changing `turbo.json`.
- Code navigation: Serena (project memories in `.serena/memories/`; start with `core`) and codegraph MCP.
- Library docs: Context7 MCP. Don't rely on memory for fast-moving APIs (Vite 8, TS 7, Hono, wrangler).

## Known gotchas

- **pnpm 11 blocks dependency build scripts.** Allow them in the root `pnpm-workspace.yaml` under `allowBuilds:`. pnpm writes placeholder keys there on failure, so edit those keys instead of appending new ones; a duplicate key breaks the YAML. `apps/backend/pnpm-workspace.yaml` is a template leftover and has no effect.
- **Stale or broken installs block every task.** `pnpm run <script>` auto-installs when dependencies are stale, so a failed install blocks every turbo task.
- **Missing native binaries** (`workerd`, Biome, turbo) come from optional platform packages. A flaky network leaves dangling symlinks, which show up as `MODULE_NOT_FOUND` or postinstall failures. Re-run `pnpm install`.
- **Errors like `TS5023 Unknown compiler option`** mean the package's dependencies aren't installed and a global, old `tsc` ran instead. Run `pnpm install`.
- **Stale knip workspaces:** `knip.json` lists workspaces that don't exist (`apps/regatta-web`, `apps/cdk`). Update it when you touch knip.
- **Unused hooks:** the `.claude/hooks/*-on-save.sh` hooks call Prettier and ESLint, which this repo doesn't use, so they are effectively no-ops.
