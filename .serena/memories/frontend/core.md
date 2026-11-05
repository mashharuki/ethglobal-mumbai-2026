# Frontend (`apps/frontend`)

- Vite 8 + React 19 + TypeScript 7 (`tsconfig.app.json` / `tsconfig.node.json`, project refs via `tsc -b`). Still the Vite template (`src/App.tsx`, `main.tsx`).
- Styling: **lism-css** (`lism-css` dep). Use project skills `lism-css-guide` (implement), `lism-css-refactor` (refactor only on request), `lism-mockup-guide` (mockups); `lism-css` MCP server configured in `.claude/.mcp.json`.
- React guidance skills: `vercel-react-best-practices`, `vercel-composition-patterns`.
- Lint: oxlint (`.oxlintrc.json`: react, typescript, oxc plugins). Template files use single quotes; Biome (double quotes) is the repo formatter — run `pnpm format` after edits.
- Build output `dist/` (cached by turbo).
- API calls should follow `packages/api-specs/openapi.yaml` once defined.
