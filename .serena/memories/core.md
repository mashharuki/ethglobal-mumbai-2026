# Core

ETHGlobal Mumbai 2026 hackathon monorepo. Existing private-dating proposal and Spec Kit plans live in `specs/001-private-dating/`; do not confuse planned features with implemented behavior. PR #4 merged into main: the public frontend contains an overview and a read-only ENSv2/Arkiv participation verifier. Hono has local SIWE session and synthetic owner-only review routes, but those are not deployed or connected to the public frontend. The contract package still has only the starter Counter and read-only ENS permission tests; no deposit or matching contract. Status reviews may read specs; generation/modification requires an explicit specification-work request.

## Navigation
- Animated mentor overview: `docs/overview.html` (offline, English/Japanese, 32 seconds). `docs/overview/` holds shared SVG story/player/build sources; README GIFs and posters live in `docs/assets/private-dating-overview*`. This illustrates a proposed flow, never evidence of real proof execution or transactions.
- Target architecture and trust/data-flow boundaries: `docs/architecture.md`. Mentor overview: `docs/mentor-brief.md`, two-page Japanese/English `docs/architecture.drawio`, Japanese PNG `docs/architechture.drawio.png`, English PNG `docs/architecture-en.drawio.png`, and matching SVGs. Detailed engineering view: `docs/architecture-detail.drawio` and `.drawio.png`. PNGs embed their matching source. These are Draft, not deployed-state evidence; keep source and exports synchronized. Icon provenance: `docs/assets/icons/README.md`.
- Entry rules: `AGENTS.md`, nearest package `AGENTS.md`, relevant `.claude/rules/`. `CLAUDE.md` includes the root guide. Reply in Japanese.
- Specification ownership, split requirements, feature selection and plan-vs-code boundaries: `mem:specification/core`.
- Frontend overview, public verifier, Void/PWA build and styling: `mem:frontend/core`.
- Hono Worker, bindings and backend script limitations: `mem:backend/core`.
- Hardhat sample, test layers and compiler profiles: `mem:contract/core`.
- Independent Next.js AIBot, approved Persona data and parent adapter boundaries: `mem:aibot/core`.
- Toolchain/workspace/cache details: `mem:tech_stack`.
- Commands and CLI traps: `mem:suggested_commands`.
- Style, tests and Git rules: `mem:conventions`.
- CI and completion checks: `mem:task_completion`.
- Memory structure/update policy: `mem:memory_maintenance`.

`packages/api-specs/openapi.yaml` now defines the planned HTTP contract, but generated client and many routes are absent. `packages/shared/src/participation/` contains qualification schemas and signature logic; see `mem:participation/core`. `circuits/oracle.ts` is a plaintext synthetic oracle, not a Noir proof. Package scripts and current source override older template notes. Installed skills are support code, not application implementation.
