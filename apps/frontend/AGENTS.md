# AGENTS.md — apps/frontend

Web UI / PWA package. Read the root `AGENTS.md` first; its approval boundaries (dependencies, deploys, pushes, CI) apply here. Reply to the user in Japanese.

<!--injected-by-void-v1.6.1-->
## Void

- This project uses [Void](https://void.cloud), a full-stack Vite framework for Cloudflare Workers with file-based API routing, server-rendered pages, and typed backend services.
- Use Void's CLI and typed APIs. Before working with Void, read the relevant Markdown docs in `node_modules/void/docs/`; start with `guide/quickstart.md` for setup and `reference/cli.md` for commands.

<!--/injected-by-void-->

## Current state

- React 19 + Vite 8 + TypeScript 7 + Void 1.6 + `vite-plugin-pwa`. `src/` holds only the Vite starter (`App.tsx`, `main.tsx`, CSS, assets). No planned screen exists yet.
- lism-css is installed but not used yet. oxlint (`.oxlintrc.json`) is the linter, with `react/rules-of-hooks` set to error.
- Void generates `.void/` (gitignored), which `tsconfig.json` extends. The `build` script runs `void prepare` first so `tsc -b` works on a clean CI checkout. Do not remove that step or commit `.void/`.
- Build output goes to `.cloudflare/output/` (Worker and assets) and `dist/client/` (PWA `sw.js` and workbox). `dist/` alone is not the full build.

## Planned responsibility (Draft spec, not implemented)

From `specs/001-private-dating/frontend.md` and `plan.md`:

- Registration input (hobbies, self-reported gender/relationship goal and preferences). Secrets and per-field randomness stay on the device.
- Participation-credential display (valid / invalid / unverifiable), concurrent search, the invitation flow, and the confirming / matched / not-matched states.
- Showing the public scope, token (USDC/EURC address), amount and deadline rule **before** signing. Stop deposit actions off Ethereum Sepolia.
- Selective disclosure on the device, signing a mutual end, a standalone refund after the deadline, and showing the suspension reason and the appeal path.
- An optional handoff to the AIBot Persona conversation, which uses a separate AI consent flow and never sends matching secrets.

Noir circuits are planned for a new top-level `circuits/`, not inside this package. Wallet connection (Kohaku), Anon RPC and NoirJS/Barretenberg are planned and not installed. Ask before adding them; the `anthropic-skills:kohaku-sdk-builder` and `anthropic-skills:anon-rpc-builder` skills cover them.

## Privacy boundaries

- Never send plaintext attributes, preference masks, hobbies or matching secrets to the API, logs, analytics, public records or AI models. Send only ciphertext and the public registration proof.
- Output only the overall true/false and a pseudonym. Never show per-condition results, shared items or counts.
- Keep device secrets out of the PWA service-worker cache. Workbox precaches **static assets only**; do not add runtime caching for API responses.
- Do not treat `localStorage` as secure storage for keys. Choose the secret-storage approach explicitly and document its limits.
- No credit scores and no "low rating" labels for new users (FR-016).

## Implementation conventions

- API calls go through the contract in `packages/api-specs/openapi.yaml` and the types in `packages/shared`. Do not hand-write request/response types.
- `apps/backend` (Hono) is the planned API. Do not add Void `routes/`, `pages/`, `db/` or other server-side directories here unless the user decides to move API work into Void.
- UI and styling: load the `lism-css-guide` skill before implementing (`lism-mockup-guide` for mockups, and `lism-css-refactor` only when asked). Also apply `vercel-react-best-practices` and `vercel-composition-patterns`.
- Components must not export non-component values (oxlint `only-export-components`). Name booleans `is/has/should` and keep components and functions under 50 lines.
- Vite 8, TypeScript 7 and Void change quickly. Check Context7, `node_modules/void/docs/`, or the version-matched official docs instead of memory.

## Commands

```sh
pnpm --filter frontend dev       # vite dev server (also generates .void/)
pnpm --filter frontend lint      # oxlint
pnpm --filter frontend build     # void prepare && tsc -b && vite build
pnpm --filter frontend preview
```

There is no `test` script; Vitest is not configured.

## Verify before saying "done"

1. `pnpm --filter frontend lint`
2. `pnpm --filter frontend build`
3. `pnpm exec biome ci apps/frontend`

## Ask first

- `void deploy`, `void connect` and `void secret sync` (external deploys and secret changes).
- Adding dependencies (wallet SDK, Noir, router, state library, Vitest, and so on).
- Changing the PWA caching strategy or `void.config.ts` Worker settings.
