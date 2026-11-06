# Core

ETHGlobal Mumbai 2026 hackathon monorepo. Existing private-dating proposal and Spec Kit plans live in `specs/001-private-dating/`; do not confuse planned features with implemented behavior. Frontend/backend and the Counter contract are still sample applications. Status reviews may read specs; generation/modification requires an explicit specification-work request.

## Navigation
- Entry rules: `AGENTS.md`, nearest package `AGENTS.md`, relevant `.claude/rules/`. `CLAUDE.md` includes the root guide. Reply in Japanese.
- Specification ownership, split requirements, feature selection and plan-vs-code boundaries: `mem:specification/core`.
- Frontend template, Void/PWA build and styling: `mem:frontend/core`.
- Hono Worker, bindings and backend script limitations: `mem:backend/core`.
- Hardhat sample, test layers and compiler profiles: `mem:contract/core`.
- Separate teammate-owned simulation plan and submodule boundaries: `mem:python_runtime/core`.
- Toolchain/workspace/cache details: `mem:tech_stack`.
- Commands and CLI traps: `mem:suggested_commands`.
- Style, tests and Git rules: `mem:conventions`.
- CI and completion checks: `mem:task_completion`.
- Memory structure/update policy: `mem:memory_maintenance`.

`packages/api-specs/openapi.yaml` is the intended machine-readable HTTP contract but is empty; `packages/shared` has no shared implementation. Their test scripts are failing placeholders. Installed skills are support code, not application implementation. Current source/config and explicit user decisions override stale memories.
