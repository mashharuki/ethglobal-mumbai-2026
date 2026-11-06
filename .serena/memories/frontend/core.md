# Frontend (`apps/frontend`)

- Vite 8 + React 19 + TypeScript 7; `tsc -b` project references. `src/App.tsx` still renders the Vite counter template.
- `vite.config.ts` enables Void, React and vite-plugin-pwa. `void.config.ts` configures the Worker compatibility date; `apps/frontend/AGENTS.md` points to installed `void/docs/` (quickstart and CLI).
- Do not assume static-SPA-only architecture: build emits a Worker and assets under `.cloudflare/output/v0/workers/default/`, plus PWA files in `dist/client/`. Current Turbo output globs omit .cloudflare/output.
- Backend remains a separate Hono Worker template. Void presence does not establish product API integration; use the specification's service ownership and API contract before implementing.
- Styling dependency: lism-css. Skills: lism-css-guide for implementation, lism-mockup-guide for mockups, lism-css-refactor only when requested; React guidance via vercel-react-best-practices and vercel-composition-patterns.
- Lint: oxlint, plus root Biome checks. Scripts: dev, build, lint, preview; no test script yet.
- API calls must follow packages/api-specs/openapi.yaml once populated; existing HTTP design is in specs/001-private-dating/contracts/service.md.
