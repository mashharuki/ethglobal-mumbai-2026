# Core

ETHGlobal Mumbai 2026 hackathon repo. As of 2026-11 it is a scaffold only: `apps/` and `packages/` contain just `.gitkeep`; no app code yet.

## Source map
- `apps/*`, `packages/*` — pnpm workspace members (see `pnpm-workspace.yaml`).
- `.claude/` — Claude Code config: `rules/*.md` (authoritative coding/git/testing/security rules), `hooks/*.sh`, `settings.json` (permissions allow/deny).
- `.specify/` + `.agents/skills/speckit-*` — Spec Kit (spec-driven dev) scaffolding; `.specify/memory/constitution.md` is still the unfilled template.
- `AGENTS.md` is empty; `CLAUDE.md` only points to it.

## Invariants / gotchas
- `knip.json` lists workspaces (`apps/frontend`, `apps/regatta-web`, `apps/cdk`) copied from another project; they don't exist here — update when real apps are added.
- Claude hooks `format-on-save.sh` / `lint-on-save.sh` call Prettier / ESLint, but the repo's formatter+linter is Biome. Prettier hook is a no-op without a prettierrc.

Further memories:
- languages, tooling, version pins: `mem:tech_stack`
- dev/lint/format commands and Darwin shell differences: `mem:suggested_commands`
- code style, naming, git/commit rules: `mem:conventions`
- what to run before declaring a task done: `mem:task_completion`
