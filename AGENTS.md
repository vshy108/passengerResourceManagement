# Agent Instructions — Spaceship X26 PRMS

These are the house rules for any AI coding agent (Copilot, Cursor, etc.) or
human contributor working in this repository. Read this file before making
changes.

## 1. Language & Runtime
- **TypeScript 5.x**, `strict: true`, `noUncheckedIndexedAccess: true`.
- **Node.js 20 LTS**.
- Target: ESM modules.

## 2. Architecture
Layered, dependency points **inward only**:

```
interface  →  application  →  domain
                 ↑
           infrastructure
```

- **domain/**: pure. No I/O, no `Date.now()`, no `console`, no external imports.
- **application/**: services that orchestrate domain + ports. Depend on
  repository *interfaces*, never concrete implementations.
- **infrastructure/**: concrete repos, clock, loggers. Implements ports.
- **interface/**: CLI (or HTTP) adapters. Thin. No business logic.

## 3. Core Conventions
- **No exceptions for expected failures.** Services return
  `Result<T, DomainError>` (discriminated union). `throw` is reserved for
  programmer errors / invariant violations.
- **Tier comparison** uses `tier.rank()` — never string equality for ordering.
- **Clock** is injected (`Clock` interface). Never call `Date.now()` or
  `new Date()` inside `domain/` or `application/`.
- **IDs** are branded types (`PassengerId`, `ResourceId`, …) to prevent mix-ups.
- **Enums** are string literal unions: `type Tier = 'Silver' | 'Gold' | 'Platinum'`.
- Every access attempt (allowed **or** denied) emits a `UsageEvent`.
- Repository interfaces live with their consumers (application layer).

## 4. Testing
- **Vitest** + BDD-style describe/it.
- **Test names mirror spec IDs**: `it('TP-R1/S1: Platinum can access Silver resources', …)`.
- Unit tests for each domain rule.
- Integration tests for service orchestrations.
- No network, no real filesystem, no real clock in tests.
- Red → green → refactor. Commit after green.

## 5. Error Handling
- Validate input at the **boundary** (interface layer) — reject unknown tiers,
  malformed IDs, etc. before they reach services.
- Domain errors are a closed sum type in `domain/errors.ts`.
- Never swallow errors silently.

## 6. Commits
- Conventional Commits: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `ci`.
- Scope where useful: `feat(tier): …`, `test(access): …`.
- **Each commit should map to one spec ID** where possible (e.g. `TP-R1`).

## 7. Security / Secure Coding
- No secrets in code or history.
- Input validation at boundaries (Zod or hand-rolled type guards).
- No `any` without an inline comment justifying it.
- `eslint --max-warnings=0` in CI.

## 8. What NOT to do
- Do not add a database, auth system, HTTP server, or UI unless explicitly scoped.
- Do not introduce runtime dependencies beyond what's in `package.json`.
- Do not rewrite the spec files to match code. Update the spec *first*, then code.
- Do not add docstrings/comments to unchanged code.

## 9. Working with specs
Specs live in `specs/`. Each file has numbered rules (`R1`, `R2`), invariants
(`I1`), and scenarios (`S1`). Workflow per slice:

1. Open the spec file.
2. Generate failing tests named after the scenario IDs.
3. Implement the minimum code to make them pass.
4. Refactor with tests green.
5. Commit with the spec ID in the message.
