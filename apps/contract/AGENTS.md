# AGENTS.md — apps/contract

Hardhat 3 + viem package for the smart contracts. Read the root `AGENTS.md` first; its approval boundaries (dependencies, deploys, pushes, CI) apply here. Reply to the user in Japanese.

## Project layout

```
contracts/        Solidity sources (*.sol) and Solidity unit tests (*.t.sol)
test/             TypeScript integration tests (node:test + viem)
ignition/modules/ Hardhat Ignition deployment modules
ignition/deployments/  Committed deployment journals (chain-11155111 = Sepolia)
scripts/          Standalone scripts run with `hardhat run`
hardhat.config.ts Build profiles and networks
```

## Current state

- Only the starter `Counter` exists: `contracts/Counter.sol`, `Counter.t.sol`, `test/Counter.ts`, `ignition/modules/Counter.ts`, plus `scripts/send-op-tx.ts` (an OP-chain sample).
- `ignition/deployments/chain-11155111/` records a past Sepolia Counter deployment. It is a deployment record, not proof of the planned product. Do not edit or delete it by hand.
- The planned deposit/settlement contracts are **not implemented**.

## Planned responsibility (Draft spec, not implemented)

From `specs/001-private-dating/smart-contract.md` and `contracts/settlement.md`:

- Deposits accept only Circle's official test USDC or EURC on Ethereum Sepolia. Check both the chain ID and the token address against the allowlist, and reject same-named tokens at other addresses.
- Each deposit expires 604800 seconds (7 days) after its confirmed block. Unbound deposits can be cancelled immediately. Binding locks both deposits atomically.
- A mutual end refunds each principal to its original owner in the original token. After the fixed deadline, each party can claim alone.
- **Principal-refund only**: no 90/10 split, penalties, fees, operator income or third-party confiscation. Reviews, suspensions and blocks never extend deadlines or move funds.
- Conservation: the payout total equals the deposits, and each claim is consumed once (FR-011). Public records hold only the amounts, token and result needed for verification.

Get Circle token addresses from Circle's official documentation at implementation time. Never write them from memory.

## Before writing Solidity

- Load the **`hardhat`** skill for tests, `hardhat.config.ts` and the `network.create()` API. Load **`hardhat-toolbox-viem`** for clients, `deployContract`, reads/writes and `viem.assertions`.
- Before writing contract code or shipping onchain, find the relevant **`ethskills:*`** skills (`security`, `testing`, `standards`, `addresses`, `audit`, `ship`). If a skill you need is missing, report the gap instead of fetching a substitute.
- ERC-20 handling: use safe transfer patterns, verify the actually received amount, follow checks-effects-interactions, and add reentrancy protection for external calls. Adding a library such as OpenZeppelin is a dependency change: ask first.

## Build profiles and networks

| Profile | Use |
|---|---|
| `slang` (experimental) | Local `build` / `test` / `check-types` scripts and CI. **Not for deployment.** |
| `default` | Plain solc 0.8.37 |
| `production` | solc 0.8.37 with optimizer (200 runs). Use for deployment. |

Networks: `hardhatMainnet` (simulated L1), `hardhatOp` (simulated OP) and `sepolia`. `sepolia` reads `SEPOLIA_RPC_URL` and `SEPOLIA_PRIVATE_KEY` via `configVariable()`, which resolves only when that network is selected. Values come from `apps/contract/.env` (loaded by `hardhat.config.ts`) or the keystore.

**Never read, print or commit `.env` or `.env.*`.** Ask the user for the variable names and values if needed. Never put private keys in code, tests or logs.

## Testing

- Solidity unit tests (`*.t.sol`, forge-std cheatcodes) cover contract-internal logic. TypeScript tests (`node:test`) cover multi-step flows, events and time travel via `networkHelpers`.
- Cover every acceptance example in `contracts/settlement.md`: the allowlist, the exact deadline boundary, a concurrent bind race, a double claim, a failed transfer rollback, and conservation of totals.
- Run tests locally only. Never point tests at Sepolia.

## Commands

```sh
pnpm --filter contract build             # hardhat build --build-profile slang
pnpm --filter contract test              # Solidity + node:test, slang profile
pnpm --filter contract check-types       # build, then tsc --noEmit
pnpm --filter contract format:sol        # Prettier for *.sol (Biome does not format Solidity)
pnpm --filter contract format:sol:check
```

## Verify before saying "done"

1. `pnpm --filter contract format:sol:check`
2. `pnpm --filter contract build`
3. `pnpm --filter contract test`
4. `pnpm exec biome ci apps/contract` for TypeScript files

## Ask first

- Any Ignition deploy or script run against `sepolia` (for example `deploy:Counter --network sepolia`), contract verification, and onchain transactions.
- Adding dependencies or changing compiler versions or profiles.

## Docs

- Hardhat 3 — https://hardhat.org/llms.txt
- viem — https://viem.sh/llms.txt
