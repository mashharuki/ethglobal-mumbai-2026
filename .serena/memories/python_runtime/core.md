# Python runtime (`ETH-Global-Mumbai-2026-P/`, git submodule)

- Separate repo `github.com/Jun0908/ETH-Global-Mumbai-2026-P` (teammate-owned); this repo only pins a commit. Commit/push inside the submodule first, then commit the pointer here.
- Purpose: runtime parts implemented in Python, split out of the TS monorepo.
- Current content: plan docs only (`README.md`, `SETUP.md` human setup steps, `Task.md` 57-step / 319-item plan with IDs `T01.01`…, `.env.example`). No code yet.
- Planned stack per `Task.md`: MuJoCo physics sim + simulation API + browser experiment UI (Three.js replay), NVIDIA Cosmos video generation on AWS EC2 GPU via SSH tunnel, 0G Compute (AI action selection) and 0G Storage (shareable run records). Priorities P0/P1/P2.
- Treat `Task.md` as the teammate's plan, not this repo's spec; the overall product idea is still undecided.
- Not part of pnpm/turbo/Biome; don't apply JS tooling there. `.env` there holds secrets (reading `.env*` is denied).
