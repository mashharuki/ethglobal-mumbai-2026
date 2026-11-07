# AGENTS.md

Guide for AI coding agents working in this repository. Read this first, then the nearest package `AGENTS.md` and the relevant `.claude/rules/` files. Approval boundaries here also apply when generic rules describe automatic commit/push workflows.
Always reply to the user in **Japanese**.

## Project status

- Hackathon project for **ETHGlobal Mumbai 2026**.
- An existing **private dating / matching proposal** lives in `specs/001-private-dating/`. The live frontend has an overview and read-only ENSv2/Arkiv participation verifier. Local SIWE/Hono auth, synthetic owner-only review routes and isolated in-person/review previews are in the repository; they are not deployed or joined to matching. Counter is still the only sample contract. Issuer and independent verification scripts live outside the app routes. The AIBot submodule has a standalone Persona conversation implementation; parent matching integration is unverified. A written requirement is not implemented behavior.
- The specification remains **Draft** and `.specify/memory/constitution.md` is an unratified template. Ethereum Foundation, ENS and Arkiv are confirmed prize targets; this does not imply that the whole specification is approved or the prize requirements are met.
- **Do not generate or modify Spec Kit artifacts** (`speckit-*`, `.specify/`, `specs/`) unless the user asks for specification work. A status review may read them without starting a workflow.

## Specification entry points

- Start with `specs/001-private-dating/spec.md`. Functional requirements are split across `frontend.md`, `backend.md`, and `smart-contract.md`; read the relevant part as well.
- `planning-input.md` records planning input; `plan.md`, `research.md`, `data-model.md`, and `contracts/` describe the proposed implementation. `tasks.md` tracks implementation; `checklists/requirements.md` tracks specification quality, not feature completion.
- `prize-targets.md` is the source of truth for the three confirmed prize targets, official conditions, role owners, demos and submission decisions. Keep its IDs aligned with the specifications and tasks; distinguish documented targets from verified eligibility.
- `quickstart.md` distinguishes current scaffolding from the intended application. `packages/api-specs/openapi.yaml` now describes the proposed HTTP contract; most operations do not have live handlers and the generated client is pending.
- Feature selection uses `SPECIFY_FEATURE_DIRECTORY` or local, ignored `.specify/feature.json`, **not the Git branch name**. For the existing proposal use `SPECIFY_FEATURE_DIRECTORY=specs/001-private-dating` when running an authorized workflow. Check local integration metadata before assuming a particular agent integration is registered.

## Repository map

| Path | What it is | Stack |
|---|---|---|
| `apps/frontend` | Overview UI and read-only ENSv2/Arkiv verifier, with Void + PWA | React 19, Vite 8, TypeScript 7, lism-css, oxlint |
| `apps/backend` | Local SIWE/Hono and synthetic owner-only review routes plus participation issuance/evidence code | Hono 4 on Cloudflare Workers (wrangler) |
| `apps/contract` | Counter sample, Solidity + TS tests, Ignition | Hardhat 3, viem, Solidity 0.8.37, TypeScript 6 |
| `packages/api-specs` | Proposed HTTP API contract (`openapi.yaml`) | OpenAPI 3.1 |
| `packages/shared` | Participation schema, trust anchor and signature format | TypeScript, Zod, viem |
| `ethglobal-mumbai-2026-AIBot/` | **Independent AI simulation app (git submodule)** | Next.js, React, TypeScript; its own npm project |
| `specs/001-private-dating/` | Existing proposal, design and implementation tasks | Spec Kit Markdown artifacts |
| `.claude/rules/` | Authoritative coding / git / testing / security rules | — |
| `.claude/skills/`, `.agents/skills/` | Project skills; discover availability before invoking | — |

Tooling: pnpm 11 workspaces (`apps/*`, `packages/*`) + Turborepo 2 + Biome 2.5 + knip + jscpd. Node 24.

## AI simulation submodule: `ethglobal-mumbai-2026-AIBot/`

The teammate-owned repository is `https://github.com/Jun0908/ethglobal-mumbai-2026-AIBot.git`. It contains LOVE MATCH MASALA, a standalone Next.js / React / TypeScript app for approved Persona conversations.

- It is **not** a parent pnpm workspace or Turbo package. Use its own `AGENTS.md`, npm lockfile and scripts when work there is authorized; never run parent-wide formatters over it or copy it into `apps/`.
- Source-level implementation and author-reported tests exist. Parent PSI/authentication, real date requests and external publication are separate integration gates. Read its `README.md` and `docs/MATCHING_ADAPTER.md`; the parent contract is `specs/001-private-dating/contracts/simulation.md`.
- The user adopted Persona conversation as optional P2. The old two-human shared World Model and the old Python/MuJoCo/Cosmos plan are not the current implementation target.
- Keep matching secrets on the client. Persona/interview/conversation data use a separate AI consent flow and are processed by the AIBot/AI provider. At-rest encryption is not E2EE.
- Ask before submodule edits, pointer updates or pushes. Preserve an existing dirty gitlink as user work. A working checkout may be newer than the commit recorded by the parent.
- For authorized edits, commit/push inside the submodule first, then record the new parent gitlink. Use `git -C ethglobal-mumbai-2026-AIBot ...`; after clone use `git submodule update --init --recursive`.
- Never read, print or commit `.env*`, `.data/`, keys, Persona capsules or conversation data.

## Commands

```sh
pnpm install                       # install all workspaces
pnpm dev                           # turbo run dev (all apps)
pnpm build | check-types | lint | test   # turbo run <task>
pnpm turbo run <task> --filter=frontend  # one package
pnpm format                        # biome format --write . (formatting only)
pnpm exec biome ci .               # CI-equivalent format+lint check
pnpm exec knip                     # unused files/exports/deps
pnpm --filter backend dev          # wrangler dev
pnpm --filter backend cf-typegen   # regenerate CloudflareBindings types after editing wrangler.jsonc
pnpm --filter contract build       # local build using experimental slang profile
pnpm --filter contract test        # Solidity tests + node:test integration tests
```

A package only runs a turbo task if it defines that script. Backend has `check-types` and a `test` script covering participation and auth. Frontend has no `test` script; its in-person and review fixture tests are run explicitly. The shared package has a working participation `test` script. `api-specs` may still have a placeholder script, so verify package scripts before treating root `pnpm test` as a gate.

## Verify before saying "done"

Run the checks that CI runs (`.github/workflows/ci.yml`) for whatever you touched:

1. `pnpm exec biome ci .`
2. Frontend: `pnpm --filter frontend lint && pnpm --filter frontend build`
3. Backend: `pnpm --filter backend exec wrangler deploy --dry-run --outdir=dist`
4. Contract: `pnpm --filter contract format:sol:check`, `pnpm --filter contract build`, and `pnpm --filter contract test`.
5. Keep `pnpm-lock.yaml` in sync (CI uses `--frozen-lockfile`).

For documentation-only edits, check `git diff --check` and referenced paths; runtime checks are needed only when reviewing runtime health or changing code/config. Biome does not validate these Markdown documents. Report failures with the actual output, distinguishing pre-existing failures from regressions. Never claim success without running the checks.

## Conventions (summary; full rules in `.claude/rules/`)

- **Code style** (`code-style.md`): prefer `const`, never `var`, early returns, functions under 50 lines, `is/has/should` booleans, verb+noun function names, explicit return types on exports, `unknown` over `any`, `satisfies` over `as`, Result type `{ ok: true, data } | { ok: false, error }` for expected failures, imports ordered external → internal → relative.
- **Formatting**: Biome (2-space indent, double quotes); Solidity uses Prettier in `apps/contract`. Prefer formatting explicit changed paths; avoid rewriting unrelated files during a documentation task. `pnpm format` formats the whole repository but does not fix lint errors.
- **Testing** (`testing.md`): intended app convention is colocated `foo.test.ts`, `it('should <x> when <y>')`; Vitest is not yet configured for the apps. Contracts already use Solidity tests and `node:test` with viem.
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
- Code navigation: activate this project in Serena, read its instructions and `core` memory; use codegraph MCP when available. Memories are navigation aids; current source/config and explicit user decisions take precedence over stale notes.
- Library docs: Context7 MCP when available, otherwise installed version-matched docs or official documentation. Don't rely on memory for fast-moving APIs (Vite 8, TS 7, Hono, wrangler).
- **Solidity / onchain work** (`apps/contract`): follow its `AGENTS.md`, load `hardhat` and the matching `hardhat-toolbox-viem` skill. Before writing Solidity or shipping onchain, locate the relevant `ethskills:*` skill through the available catalog/local installation. If missing, report that gap; do not assume it is installed or fetch a remote skill as a substitute. The current experimental `slang` profile is for local builds/tests, not deployment.
- **ENS integration**: no packaged skill exists for ENS yet. Before writing any ENS name-resolution code, fetch `https://docs.ens.domains/llms.txt` (WebFetch) to get current contract addresses and resolver APIs — don't rely on memory, they change across ENS versions.

## Known gotchas

- **pnpm 11 blocks dependency build scripts.** Allow them in the root `pnpm-workspace.yaml` under `allowBuilds:`. pnpm writes placeholder keys there on failure, so edit those keys instead of appending new ones; a duplicate key breaks the YAML. `apps/backend/pnpm-workspace.yaml` is a template leftover and has no effect.
- **Stale or broken installs block every task.** `pnpm run <script>` auto-installs when dependencies are stale, so a failed install blocks every turbo task.
- **Missing native binaries** (`workerd`, Biome, turbo) come from optional platform packages. A flaky network leaves dangling symlinks, which show up as `MODULE_NOT_FOUND` or postinstall failures. Re-run `pnpm install`.
- **Errors like `TS5023 Unknown compiler option`** mean the package's dependencies aren't installed and a global, old `tsc` ran instead. Run `pnpm install`.
- **Stale knip workspaces:** `knip.json` lists workspaces that don't exist (`apps/regatta-web`, `apps/cdk`). Update it when you touch knip.
- **Void build output:** frontend emits Worker/assets under `.cloudflare/output/` as well as PWA files under `dist/client/`. Do not assume `dist/` is the complete build or that Turbo caches all of it.
- **Imported skills in Biome:** `.agents/skills/` and the AIBot submodule are excluded from parent Biome, just as `.claude/` is. Validate those separately when authorized; do not rewrite installed skills to make an unrelated task green.
- **Legacy hooks:** `.claude/hooks/*-on-save.sh` target Prettier/ESLint and do not replace the actual Biome/oxlint checks. Prettier is used separately for Solidity.
