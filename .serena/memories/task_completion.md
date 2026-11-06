# Task completion

Source of truth: `.github/workflows/ci.yml` (lint-and-format, frontend, backend, contract). Run checks relevant to changed code/config; do not infer runtime health from documentation.

1. `pnpm exec biome ci .`. `pnpm format` formats only; it does not fix lint errors. Do not rewrite imported skill code just to make an unrelated task pass.
2. Frontend: `pnpm --filter frontend lint` and `pnpm --filter frontend build`.
3. Backend: `pnpm --filter backend exec wrangler deploy --dry-run --outdir=dist`. This checks bundling, not remote runtime/bindings.
4. Contract: `pnpm --filter contract format:sol:check`, `pnpm --filter contract build`, `pnpm --filter contract test`. Use package scripts' local slang profile; production compiler/deployment is a separate concern.
5. Keep lockfile synced; CI installs with `pnpm install --frozen-lockfile`.
6. Documentation-only changes: `git diff --check` and verify referenced paths/content; Biome does not validate Markdown. Runtime checks are useful for explicit project-health reviews.
7. Root `pnpm test` currently includes shared/api-specs placeholders that exit 1; frontend/backend have no test scripts. Do not describe root test as a configured application test suite.
8. Report actual failing output, pre-existing failures and environmental blockers separately. No success claims for checks not run.
9. Review explicit changed paths before staging; preserve parallel work. Push/deployment/submodule changes follow root approval boundaries; generic learning-loop rules do not authorize them.
