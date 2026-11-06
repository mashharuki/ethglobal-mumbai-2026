# Python runtime submodule

- `ETH-Global-Mumbai-2026-P/` points to teammate-owned `github.com/Jun0908/ETH-Global-Mumbai-2026-P`. Parent tracks a commit, not automatically the teammate's latest branch.
- Tracked content is documentation/setup only: README.md, SETUP.md, Task.md (57 stages / 319 items). No runtime implementation is present at the currently pinned revision.
- Task.md proposes a physics-simulation/video-generation platform: MuJoCo, browser/Three.js replay, Cosmos on AWS GPU, 0G Compute and 0G Storage.
- This plan is distinct from specs/001-private-dating. A proposed optional simulation feature does not prove agreed integration; do not import the teammate's whole roadmap, cloud budget, or push policies into parent work.
- Read-only inspection is part of project review. Ask before edits/pointer updates or pushes. When changes are authorized, commit/push within submodule first, then commit the updated parent pointer.
- Never read/print/commit .env*. Do not apply pnpm/Turbo/Biome to the submodule or add Python runtime code under apps/packages.
- Use `git -C ETH-Global-Mumbai-2026-P ...`; initialize after clone with `git submodule update --init --recursive`.
