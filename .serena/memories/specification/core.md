# Specification context

- Existing proposal: `specs/001-private-dating/`. Entry `spec.md`; functional requirements are owned by `frontend.md`, `backend.md`, `smart-contract.md`, so reading only the entry spec misses requirements.
- Proposed scope: private-profile concurrent matching; stablecoin deposit, mutual settlement and expiry refund; optional paired simulation. These are documented intentions, not operational guarantees.
- `planning-input.md` records planning input. Design: `plan.md`, `research.md`, `data-model.md`, `contracts/{participation,participation-review,service,matching,settlement}.md`. `quickstart.md` distinguishes scaffold from target.
- Adopted sequence: ENS role separation + independent credential verification → mutual-preference private matching → bounded N-user scheduling. Credential verification is separate from paid product registration and room access; do not restore a dependency on ZK/deposits for the first ENS demo. Adopted: evidence-backed participation restrictions, private notices/appeals/recovery using synthetic cases. Match deposits now return each owner’s principal; old 90/10/operating penalty revenue is removed. New slashing and separate bonds remain outside MVP. Authentication for notices/appeals/fund recovery is separate from new-match eligibility. Exact gates and tasks live in plan/tasks, not this memory.
- `tasks.md` tracks implementation. `checklists/requirements.md` tracks specification quality; checked requirements do not prove working code or success-criteria measurements.
- Overall specification remains Draft; `.specify/memory/constitution.md` is unratified. Confirming prize targets does not approve the whole feature or establish eligibility.
- `prize-targets.md` is the authoritative prize matrix: EF-CROPS (Web/ZK), ENS-V2 (API), ARKIV-APP (Arkiv/API) are confirmed targets. EF-RPC is an additional conditional entry within the EF partner slot. Official conditions, product demo gates and final decisions are distinct.
- Prize evidence tasks: T032 Arkiv, T034 ENS (first technical gate), T035 EF, T036 final per-prize decision. Existing T001–T036 IDs are preserved; additions extend the list. Specification-quality checkboxes do not mean live integrations or submission are complete.
- Cryptographic matching across independent clients and private atomic settlement/recovery are feasibility gates in the plan. Do not equate mocks or registration proofs with complete private matching/settlement.
- HTTP design Markdown has not yet been populated into `packages/api-specs/openapi.yaml`. Shared implementation belongs in `packages/shared`.
- Optional US3 now adopts the standalone Persona-conversation AIBot, not two-human shared turns. Parent identity/match/date-request integration remains unverified. See `mem:aibot/core` and contracts/simulation.md. AI consent/data are separate from matching secrets.

## Local Spec Kit behavior
- Read `.specify/init-options.json` and `integration.json` for installed version/integrations; existing initialization records v1.0.3 and Claude. A Codex manifest alone does not establish registration.
- `.specify/scripts/bash/common.sh` resolves feature directory from `SPECIFY_FEATURE_DIRECTORY`, then `.specify/feature.json`; it does not infer from the Git branch.
- `.specify/feature.json` is local/ignored and absent in a fresh clone. Explicit existing target: `SPECIFY_FEATURE_DIRECTORY=specs/001-private-dating`.
- Do not regenerate spec/plan/tasks or ratify the constitution merely to review project status.

- Arkiv booth follow-up: 120-second live pitch, value-first UI (`docs/demo-script.md`). T043 tracks UI/clarity, T044 conditionally integrates public scene assets using Arkiv + Swarm. Bonus is an additional Arkiv award, not a fourth provider; keep AI private data off public storage. All original task IDs retained, completion gates still apply.
