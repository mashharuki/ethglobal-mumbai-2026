# Specification context

- Existing proposal: `specs/001-private-dating/`. Entry `spec.md`; functional requirements are owned by `frontend.md`, `backend.md`, `smart-contract.md`, so reading only the entry spec misses requirements.
- Proposed scope: private-profile concurrent matching; stablecoin deposit, mutual settlement and expiry refund; optional paired simulation. These are documented intentions, not operational guarantees.
- `planning-input.md` records planning input. Design: `plan.md`, `research.md`, `data-model.md`, `contracts/{service,matching,settlement}.md`. `quickstart.md` distinguishes scaffold from target.
- `tasks.md` tracks implementation. `checklists/requirements.md` tracks specification quality; checked requirements do not prove working code or success-criteria measurements.
- Overall specification remains Draft; `.specify/memory/constitution.md` is unratified. Confirming prize targets does not approve the whole feature or establish eligibility.
- `prize-targets.md` is the authoritative prize matrix: EF-CROPS (Web/ZK), ENS-V2 (API), ARKIV-APP (Arkiv/API) are confirmed targets. EF-RPC is an additional conditional entry within the EF partner slot. Official conditions, product demo gates and final decisions are distinct.
- Prize evidence tasks: T032 Arkiv, T034 ENS, T035 EF, T036 final per-prize decision. Existing T001–T033 IDs are preserved. Specification-quality checkboxes do not mean live integrations or submission are complete.
- Cryptographic matching across independent clients and private atomic settlement/recovery are feasibility gates in the plan. Do not equate mocks or registration proofs with complete private matching/settlement.
- HTTP design Markdown has not yet been populated into `packages/api-specs/openapi.yaml`. Shared implementation belongs in `packages/shared`.
- Python submodule's simulation plan is separate; no integration may be inferred from its presence. See `mem:python_runtime/core`.

## Local Spec Kit behavior
- Read `.specify/init-options.json` and `integration.json` for installed version/integrations; existing initialization records v1.0.3 and Claude. A Codex manifest alone does not establish registration.
- `.specify/scripts/bash/common.sh` resolves feature directory from `SPECIFY_FEATURE_DIRECTORY`, then `.specify/feature.json`; it does not infer from the Git branch.
- `.specify/feature.json` is local/ignored and absent in a fresh clone. Explicit existing target: `SPECIFY_FEATURE_DIRECTORY=specs/001-private-dating`.
- Do not regenerate spec/plan/tasks or ratify the constitution merely to review project status.
