# Suggested commands

No project scripts defined yet (root `test` script is the npm placeholder). Use tools directly:
- `pnpm install`
- `pnpm dlx @biomejs/biome check --write .` — lint + format + organize imports
- `pnpm dlx knip` — unused files/exports/deps
- `pnpm dlx jscpd .` — duplication report
- `pnpm -r <script>` / `pnpm --filter <pkg> <script>` — run across / within workspaces

Darwin notes:
- BSD `sed`: in-place edit needs `sed -i '' ...`.
- Prefer `git -C <path>` over `cd` (shared CWD across parallel Bash calls).
- `rm -rf`, `curl`, `wget`, `git push --force`, `git reset --hard` are denied in `.claude/settings.json`.
