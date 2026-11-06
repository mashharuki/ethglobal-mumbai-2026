# Conventions

Read root/nearest `AGENTS.md` and relevant `.claude/rules/*.md`.
- Prefer const; never var. Early returns, functions < 50 lines. Booleans is/has/should; functions verb+noun.
- Explicit return types on exports; type for shapes, interface for extensible contracts; unknown over any; satisfies over as; discriminated unions for exclusive state.
- Expected failures: Result `{ ok: true, data } | { ok: false, error }`; throw for unexpected/programmer errors; no empty catch. Log context without secret/private payloads.
- Imports external → internal → relative; prefer configured aliases over deep ../.
- Intended app tests: colocated foo.test.ts, `it('should <expected> when <condition>')`; Vitest is not yet configured. Contract tests use Solidity + node:test/viem under package rules.
- Formatting: Biome double quotes for JS/TS; Solidity Prettier. Scope formatting to changed files when preserving unrelated work.
- Branches feat|fix/<ticket>-<desc> for new work; preserve an existing specification branch unless asked to change it. Conventional Commits, imperative, explicit staged paths.
- Ask before adding dependencies, changing Turbo/workspace/CI, deploying, pushing, or modifying the teammate-owned submodule. No direct main pushes, force pushes, destructive Git, or reading/committing .env*.
- Parent HTTP API contract belongs in packages/api-specs/openapi.yaml; shared TS code in packages/shared. The AIBot submodule uses its own npm tooling; do not apply parent formatters or assume it is Python.
- User-facing language: Japanese. Current source/config overrides stale memory; specification intentions must be distinguished from working implementation.
