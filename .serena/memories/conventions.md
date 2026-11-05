# Conventions

Authoritative source: `.claude/rules/*.md`. Key points:
- `const` only (no `var`), early returns, functions < 50 lines.
- Booleans `is/has/should*`; functions verb+noun.
- Explicit return types on exports; `type` for shapes, `interface` for extendable contracts; `unknown` over `any`; `satisfies` over `as`; discriminated unions for exclusive state.
- Expected failures: Result `{ ok: true, data } | { ok: false, error }`; throw only for programmer errors; no empty catch; log with context.
- Imports grouped external → internal → relative; `@/` aliases instead of deep `../`.
- Tests colocated `foo.test.ts`; `it('should <x> when <y>')`; factory functions for test data.
- Git: branches `feat|fix/<ticket>-<desc>`, never push to `main`; Conventional Commits, imperative; stage explicit paths (not `git add -A`).
- User-facing chat language: Japanese.
