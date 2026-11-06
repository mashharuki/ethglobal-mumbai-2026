# Suggested commands

- Root Turbo scripts: `pnpm dev`, `pnpm build`, `pnpm check-types`, `pnpm lint`, `pnpm test`. Missing workspace scripts are skipped; root test also includes failing shared/api-specs placeholders.
- Scoped task: `pnpm --filter <frontend|backend|contract|shared|api-specs> <script>` or `pnpm turbo run <task> --filter=<package>`.
- `pnpm format` = `biome format --write .` (format only). Prefer `pnpm exec biome format --write <changed-paths>` when unrelated changes must be preserved. Markdown docs are not covered.
- CI Biome: `pnpm exec biome ci .`; this may report installed .agents skill scripts as well as application files.
- Frontend: `pnpm --filter frontend lint`, `pnpm --filter frontend build`.
- Backend: `pnpm --filter backend dev`, `pnpm --filter backend cf-typegen`; local packaging check `pnpm --filter backend exec wrangler deploy --dry-run --outdir=dist`. Actual deployment requires authorization.
- Contract: `pnpm --filter contract format:sol:check`, `build`, `test`, `check-types`; these use local compilation/testing, not deployment.
- Additional tools: `pnpm exec knip`, `pnpm exec jscpd .` (knip config contains stale workspace entries).
- Submodule: `git submodule update --init --recursive` after clone; inspect with `git -C ethglobal-mumbai-2026-AIBot ...`. Changes/pushes require authorization.
- Explicit Spec Kit target for authorized work: `SPECIFY_FEATURE_DIRECTORY=specs/001-private-dating`; local feature state is ignored by Git, and branch name alone is insufficient.

Darwin: BSD sed uses `sed -i ''`; GNU timeout is not standard. Use `git -C <path>` instead of shell `cd`. Never read .env* or print secrets.
