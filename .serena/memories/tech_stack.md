# Tech stack

- TypeScript / Node, ESM (`"type": "module"` in root package.json).
- Package manager: pnpm 11.24.0 (pinned via `packageManager` + `devEngines`), workspaces `apps/*`, `packages/*`.
- pnpm 11 blocks dependency build scripts: whitelist in `pnpm-workspace.yaml` `allowBuilds:` (`name: true`). pnpm writes placeholder keys there on failure — edit them, don't append (duplicate key breaks YAML).
- Task runner: Turborepo 2.x (root devDep). Root scripts `build|dev|check-types|lint|test` delegate to `turbo run`; tasks defined in `turbo.json`. Bundled docs: `node_modules/turbo/docs/README.md` (use these, not web docs).
- Packages must define their own `build`/`check-types`/`lint`/`test` scripts for turbo to pick them up; `build` outputs cached from `dist/**` / `.next/**`.
- Lint+format: Biome 2.5.x (`biome.json`): space indent, double quotes, recommended rules, organizeImports on; ignores `.claude`, `.serena`, `.codegraph`, `**/src/api/generated`.
- Dead code: knip (`knip.json`). Duplication: jscpd (`.jscpd.json`, threshold 5%).
- Tests: Vitest expected per `.claude/rules/testing.md` (not installed yet).
- Validation: zod at system boundaries (per `.claude/rules/security.md`).
- Chain stack (EVM vs Midnight etc.) not decided yet — no contracts in repo.
