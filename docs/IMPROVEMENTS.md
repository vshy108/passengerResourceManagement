# Reviewer-DX Improvement Backlog

Future improvements not scoped into the submission pass. Each item is
independently revertible and should keep coverage at 100%.

Workflow per item:

1. Implement.
2. `npm run typecheck && npm run lint && npm run test:coverage`.
3. Commit with a Conventional Commit message.

## Intentionally skipped (out of scope)

- Collapsing Passenger/Resource into a shared base — too much refactor
  risk for the time budget; marginal clarity gain.
- `AccessPolicy` strategy class around `canAccess` — one-liner doesn't
  justify the wrapper (AGENTS.md §10).
- Generic `Brand<T, B>` helper — indirection without payoff.
- DI container — composition root is ~15 lines.

## Backlog

### A. Tighten `web/src/api.spec.ts` error expectations
**Why:** One test currently says it "falls back to Http error" but
asserts `SyntaxError`. Either update `api.ts` to consistently wrap parse
failures as `ApiError`, or rename the test to match current behavior.
**Suggested commit:** `test(web): align non-json error test with api behavior`

### B. Remove duplicate global cleanup in web API tests
**Why:** `vi.unstubAllGlobals()` runs in both `beforeEach` and
`afterEach`; one hook is enough and makes setup easier to read.
**Suggested commit:** `refactor(test-web): remove redundant unstub hook`

### C. Make `loadDemoWorld` test less order-coupled
**Why:** Current assertions rely on call numbers (1..11). Route mocked
responses by URL and method instead so test intent survives internal
call reordering.
**Suggested commit:** `test(web): make loadDemoWorld mock routing explicit`

### D. Simplify rejection assertions
**Why:** Replace try/catch re-invocation patterns with one
`rejects.toMatchObject(...)` assertion to avoid duplicate calls and make
failure output clearer.
**Suggested commit:** `refactor(test-web): use rejects.toMatchObject for ApiError`

### E. Introduce a typed headers builder in `web/src/api.ts`
**Why:** Test casts like `(init?.headers ?? {}) as Record<string, string>`
suggest header construction is too loose. A small helper returning
`HeadersInit` improves type-safety and readability.
**Suggested commit:** `refactor(web-api): centralize typed header construction`

### F. Add dedicated CI checks for `web/`
**Why:** Ensure SPA typecheck/tests/build run in CI independently from
root checks, preventing regressions that root jobs might miss.
**Suggested commit:** `ci(web): add web typecheck test and build job`

### G. Add non-interactive pre-commit quality gate
**Why:** Run fast lint/test checks before commit to catch breakages
early. Keep it deterministic and avoid interactive prompts.
**Suggested commit:** `chore(git): add pre-commit checks for lint and tests`

### H. Document safe push flow after history rewrites
**Why:** Re-signing via rebase rewrites commit hashes. Team docs should
explicitly require `git push --force-with-lease` (never bare `--force`).
**Suggested commit:** `docs(git): document force-with-lease for rewritten history`
