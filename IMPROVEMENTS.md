# Reviewer-DX Improvement Plan

Short, rubric-driven refactor pass. Each item is independently
revertible, has tests, and keeps coverage at 100%.

Workflow per item:

1. Implement.
2. `npm run typecheck && npm run lint && npm run test:coverage`.
3. Commit with a Conventional Commit message.

## Items

### 1. Extract `AuditEmitter` (SRP / DRY)
**Why:** `CrewLeadService`, `PassengerService`, and `ResourceService`
each hold a ~20-line `private emit()` with identical structure. Extract
a single `AuditEmitter` class in `src/application/audit-emitter.ts` that
takes the `AuditContext` and exposes one `record()` method. Services
receive an optional `AuditEmitter` instead of an `AuditContext`.
**Commit:** `refactor(audit): extract AuditEmitter to remove duplicated emit()`

### 2. Move `UsageEventSource` to its own port file (ISP)
**Why:** Ports belong together. Currently `UsageEventSource` lives
inside `reporting.service.ts`. Move it to
`src/application/usage-event-source.ts` next to `usage-event-sink.ts`
and make `UsageEventSink extends UsageEventSource` so the relationship
is explicit at the type level.
**Commit:** `refactor(reporting): extract UsageEventSource port`

### 3. Centralize `requireCrewLead` guard (DRY)
**Why:** Every admin mutation starts with the same 3-line actor check
(6 copies across Crew/Passenger/Resource). One helper in
`src/application/guards.ts` — `requireCrewLead(actor): Result<CrewLeadId, DomainError>` — replaces them.
**Commit:** `refactor(application): centralize requireCrewLead guard`

### 4. Use `Array.prototype.findLast` in `get()` (clarity)
**Why:** Replaces a reverse `for` loop with a one-liner. Node 20+ ships
`findLast`. Apply in both `PassengerService.get` and
`ResourceService.get`.
**Commit:** `refactor(services): use findLast for most-recent lookup`

### 5. README reviewer touches
**Why:** The rubric weighs reviewer DX. Add:
- A **"Test coverage: 100% (stmt / branch / func / line)"** line at the
  top of the README.
- A **Scripts** table listing every `npm run` target.
**Commit:** `docs(readme): add coverage line and scripts table`

### 6. Final verify + signed tag
- `npm run typecheck && npm run lint && npm run test:coverage`
- `git tag -s v1.0.0-submission -m "PRMS code challenge submission"`
- (User pushes manually per their workflow preference.)

## Intentionally skipped
- Collapsing Passenger/Resource into a shared base — too much refactor
  risk for the time budget; marginal clarity gain.
- `AccessPolicy` strategy class around `canAccess` — one-liner doesn't
  justify the wrapper (AGENTS.md §10).
- Generic `Brand<T, B>` helper — indirection without payoff.
- DI container — composition root is ~15 lines.
