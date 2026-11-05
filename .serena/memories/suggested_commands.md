# Suggested commands

Root (all via Turborepo): `pnpm dev`, `pnpm build`, `pnpm check-types`, `pnpm lint`, `pnpm test`.
- One package: `pnpm turbo run <task> --filter=<frontend|backend|shared|api-specs>` or `pnpm --filter <pkg> <script>`
- Format/lint (Biome): `pnpm format` (= `biome check --write .`); CI-equivalent: `pnpm exec biome ci .`
- Dead code / duplication: `pnpm exec knip`, `pnpm exec jscpd .`
- Backend: `pnpm --filter backend dev` (wrangler dev), `pnpm --filter backend cf-typegen`, dry build `pnpm --filter backend exec wrangler deploy --dry-run --outdir=dist`
- Submodule: `git submodule update --init --recursive` after clone; work inside it with `git -C ETH-Global-Mumbai-2026-P ...`

Darwin notes:
- BSD `sed`: `sed -i '' ...`; no GNU `timeout`.
- Prefer `git -C <path>` over `cd` (CWD shared across parallel Bash calls).
- Denied in `.claude/settings.json`: `rm -rf`, `curl`, `wget`, `git push --force`, `git reset --hard`, reading `.env*` (incl. `.env.example`).
