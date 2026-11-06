# Contract (`apps/contract`)

- Separate pnpm workspace; follow its `AGENTS.md`. Hardhat 3 + viem toolbox, Solidity 0.8.37, TypeScript 6 (root/frontend use TS 7).
- Current application source is Counter sample, not the private-dating settlement system. `contracts/Counter.t.sol` uses Solidity tests; `test/Counter.ts` uses `node:test` + viem. `ignition/modules/Counter.ts` is a sample deployment module; tracked Sepolia deployment artifacts do not prove product deployment.
- Scripts `build`, `test`, `check-types` use experimental `slang` profile; `check-types` compiles before `tsc --noEmit`. Keep solc for production/deployment; do not silently switch compiler profiles.
- Solidity formatting: Prettier + prettier-plugin-solidity, `format:sol` / `format:sol:check`. General TS files remain covered by root Biome.
- `hardhat.config.ts` uses simulated local networks and a separately configured Sepolia network. Existing build/test scripts are local; deploying or selecting a live network is a separate authorized operation.
- Config conditionally loads `apps/contract/.env`; never inspect/print secret files. Local tests do not require Sepolia credentials.
- Skills: `hardhat`, `hardhat-toolbox-viem`; locate relevant `ethskills:*` before writing Solidity/onchain work and report if unavailable. Do not claim a skill exists based solely on old notes.
- CI commands and limitations: `mem:task_completion`.
