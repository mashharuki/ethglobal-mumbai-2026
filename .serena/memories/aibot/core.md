# Independent AIBot

- `ethglobal-mumbai-2026-AIBot/` is the teammate-owned `github.com/Jun0908/ethglobal-mumbai-2026-AIBot` submodule. It is a standalone Next.js/React/TypeScript npm app, not Python or a parent pnpm/Turbo workspace. Use its own AGENTS and tooling when edits are authorized.
- User adopted optional approved-Persona conversations for US3. Old simultaneous two-human turns/World Model are deferred. Parent integration source of truth: `specs/001-private-dating/contracts/simulation.md`; current API: submodule `docs/MATCHING_ADAPTER.md`.
- Parent owns authenticated identity handoff, subject/match/Persona/current-consent authorization and idempotent date requests. AIBot owns interview/calibration/approval/encrypted Persona storage, chat, retry, revocation and UI. Do not rebuild its UI or duplicate private game state in a parent DO.
- Matching secrets stay client-side. AI interview/approved Persona/messages use separate consent and reach the AI provider. At-rest encryption is not E2EE. No Persona/chat/pair data on public Arkiv/Swarm.
- Read source and README to distinguish author-reported standalone tests from parent integration. Demo matching and live AI are independent modes; neither proves live matching integration. Single Node process/persistent disk constraints apply; restart-safe shared sessions are not implemented.
- Read-only inspection is allowed. Ask before submodule edits, gitlink updates or pushes; preserve existing user changes. Parent records a commit, not the latest remote branch. Check both gitlink and checkout before claiming reproducibility.
- Never read/print/commit `.env*`, `.data/`, keys, Persona capsules or chat data. Do not execute live paid API tests without authorization.
