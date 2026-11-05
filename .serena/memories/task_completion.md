# Task completion checklist

1. `pnpm dlx @biomejs/biome check --write .` — must be clean.
2. Type check: `pnpm -r exec tsc --noEmit` (once packages have tsconfig).
3. Tests: `pnpm -r test` (Vitest, once added).
4. `pnpm dlx knip` for new unused exports/deps (keep `knip.json` workspaces in sync with real apps).
5. Check diff for secrets; commit with Conventional Commits on a feature branch.
