# Tech stack

- TypeScript / Node, ESM (`"type": "module"` in root package.json).
- Package manager: pnpm 11.24.0 (pinned via `packageManager` + `devEngines`), workspaces `apps/*`, `packages/*`.
- Lint+format: Biome 2.5.x (`biome.json`): space indent, double quotes, recommended rules, organizeImports on; ignores `.claude`, `.serena`, `.codegraph`, `**/src/api/generated`.
- Dead code: knip (`knip.json`). Duplication: jscpd (`.jscpd.json`, threshold 5%).
- Tests: Vitest expected per `.claude/rules/testing.md` (not installed yet).
- Validation: zod at system boundaries (per `.claude/rules/security.md`).
- Chain stack (EVM vs Midnight etc.) not decided yet — no contracts in repo.
