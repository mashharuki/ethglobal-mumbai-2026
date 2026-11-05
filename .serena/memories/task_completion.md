# Task completion checklist

Mirror CI (`.github/workflows/ci.yml`: jobs lint-and-format / frontend / backend):
1. `pnpm exec biome ci .` (CI pins Biome 2.5.10) — fix with `pnpm format`.
2. Frontend touched: `pnpm --filter frontend lint` (oxlint) + `pnpm --filter frontend build` (`tsc -b && vite build`).
3. Backend touched: `pnpm --filter backend exec wrangler deploy --dry-run --outdir=dist`.
4. Once packages have them: `pnpm check-types`, `pnpm test`.
5. Lockfile must be committed in sync (CI uses `pnpm install --frozen-lockfile`).
6. New exports/deps: `pnpm exec knip`.
7. If a build fails with ancient-TS errors (`TS5023 Unknown compiler option`), deps aren't installed and a global `tsc` ran — `pnpm install`.
8. Submodule changes are committed/pushed in the submodule repo first, then the pointer bump in this repo.
