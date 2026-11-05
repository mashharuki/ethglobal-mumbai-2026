# Task completion checklist

1. `pnpm format` (Biome) — must be clean.
2. `pnpm check-types`, `pnpm lint`, `pnpm test`, `pnpm build` (all turbo; scope with `--filter`).
3. If a package's build fails with ancient-TS errors (`TS5023 Unknown compiler option`), its deps aren't installed and global `tsc` was used — run `pnpm install`.
4. `pnpm dlx knip` for new unused exports/deps (keep `knip.json` workspaces in sync with real apps).
5. Check diff for secrets; commit with Conventional Commits on a feature branch.
