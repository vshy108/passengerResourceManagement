# Plan — Spaceship X26: Passenger Resource Management System (PRMS)

## 1. Problem Summary
Build a **Passenger Resource Management System** for Spaceship X26 (Earth → Mars settlement mission).

- **Crew Leads** (admins): strictly capped at **exactly 3**. Manage passengers, resources, tier changes, and reports.
- **Passengers**: assigned a membership tier. Can discover and use resources allowed by their tier.
- **Resources**: each has a minimum required tier. Higher tiers inherit lower-tier access.

### Membership tiers (higher inherits lower)
| Tier | Adds | Inherits |
|---|---|---|
| Silver | Food Stations, Sleeping Pods, Basic Hygiene | — |
| Gold | Private Cabins, Adv. Medical Bay | Silver |
| Platinum | Luxury O2 Pods, VIP Rec Deck | Gold + Silver |

---

## 2. Deliverables by Level

### Level 1 — Basic Passenger & Resource Management
- Enforce **exactly 3 Crew Leads** (cannot add a 4th; cannot operate with < 3 if required).
- Crew Leads can CRUD passengers (name, tier).
- Crew Leads can CRUD resources (name, category, min required tier).
- Passengers can **list accessible resources** filtered by their tier (with inheritance).

### Level 2 — Dynamic Access & Validation
- `useResource(passengerId, resourceId)` performs **real-time permission check**; rejects if tier insufficient.
- Crew Leads can **upgrade/downgrade** passenger tiers; changes take effect immediately.
- **Audit log** records every attempted interaction: passenger, resource, timestamp, outcome (allowed/denied), actor if admin action.

### Level 3 — Advanced Reporting & Insights
- **Personal history**: per-passenger list of their resource usage over time.
- **Aggregated reports**: usage grouped by passenger tier (Silver/Gold/Platinum) for Crew Leads.
- **Usage analytics**: top-N high-demand resources (e.g., Luxury O2 Pods) to flag shortages.

---

## 3. Domain Model (as shipped)

```
CrewLead      { id, name }
Passenger     { id, name, tier: Silver|Gold|Platinum, deletedAt? }
Resource      { id, name, category, minTier: Silver|Gold|Platinum, deletedAt? }
UsageEvent    { id, passengerId, resourceId,
                tierAtAttempt, minTierAtAttempt,      // snapshots — history never rewrites
                timestamp, outcome: ALLOWED|DENIED }
AdminEvent    { id, actorId, action, targetKind, targetId, timestamp, details? }
Actor         = { kind: 'CrewLead'|'Passenger', id }  // auth boundary input
Result<T,E>   = { ok: true, value: T } | { ok: false, error: E }
DomainError   = closed sum (UnauthorizedActor | CrewLeadCountInvalid |
                PassengerNotFound | ResourceNotFound | AccessDenied | …)
```

### Invariants
- `CrewLeads.size === 3` at all times after bootstrap.
- `Passenger.tier` must be one of the enum values.
- `Resource.minTier` must be one of the enum values.
- Access rule: `tierRank(passenger.tier) >= tierRank(resource.minTier)`.

---

## 4. Architecture (clean, testable)

```
┌─────────────────────────────────────────────────┐
│ Interface Layer (CLI / REST — pick one)         │
├─────────────────────────────────────────────────┤
│ Application Services                            │
│  - CrewLeadService   - PassengerService         │
│  - ResourceService   - AccessService            │
│  - ReportingService                             │
├─────────────────────────────────────────────────┤
│ Domain                                          │
│  - Entities, Value Objects (Tier), Policies     │
│  - AccessPolicy (tier inheritance rule)         │
├─────────────────────────────────────────────────┤
│ Infrastructure                                  │
│  - In-memory repositories (swappable)           │
│  - Clock abstraction (for deterministic tests)  │
└─────────────────────────────────────────────────┘
```

### Key policies
- **Tier policy** (`domain/tier.ts`): `Silver < Gold < Platinum` ranking via `rank()`;
  `canAccess(passengerTier, resourceMinTier)`.
- **Crew Lead count invariant** (CL-I1): enforced inside
  `CrewLeadService.bootstrap` — bootstrap-only, no runtime add/remove.
- **Audit**: split across two append-only sinks — `AdminEvent` for admin
  mutations (emitted by `AuditEmitter`) and `UsageEvent` for every access
  attempt allowed or denied (emitted by `AccessService`).

---

## 5. Tech Stack (chosen)

- **TypeScript 5.x** (`strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`), ESM, target ES2023.
- **Node.js 24.15.0** pinned via `.nvmrc`.
- **Vitest** + `@vitest/coverage-v8` (100% thresholds enforced).
- **ESLint** flat config with `--max-warnings=0`.
- **GitHub Actions** CI: `typecheck` + `lint` + `test:coverage` on Node
  from `.nvmrc`.
- No DB and zero runtime deps in the core path — in-memory repositories
  keep reviewer DX under 60 seconds. Optional extras (JSON persistence,
  Fastify REST, React UI) are additive adapters, kept out of the core
  quickstart.

---

## 6. TDD Plan (red → green → refactor)

### Level 1 tests
- [x] `canAccess` / `rank` — matrix of tier vs minTier (`tier-policy.spec.ts`).
- [x] `CrewLeadService.bootstrap` — rejects ≠ 3 leads (`crew-lead.spec.ts`).
- [x] `PassengerService.create` — assigns tier; rejects non-Crew-Lead actors.
- [x] `ResourceService.create` — sets minTier; rejects duplicates.
- [x] `ResourceService.listAccessibleFor(tier)` — filtered set with inheritance.

### Level 2 tests
- [x] `AccessService.useResource` — Platinum allowed on Platinum-min resource.
- [x] `AccessService.useResource` — Silver denied on Gold/Platinum resources.
- [x] `PassengerService.changeTier` — upgrade/downgrade takes effect immediately.
- [x] Audit — `UsageEvent` emitted per attempt (allowed + denied); `AdminEvent`
  emitted per successful admin mutation (`audit.spec.ts`).

### Level 3 tests
- [x] `ReportingService.personalHistory(passengerId)` — insertion-order history.
- [x] `ReportingService.aggregateByTier()` — counts grouped by
  `tierAtAttempt` (snapshot, not current tier).
- [x] `ReportingService.topResources(n)` — ranking + deterministic tie-break
  by id; denied attempts ignored.

Total: **89 tests green, 100% coverage** across all four layers.

---

## 7. Edge Cases & Gotchas
- Attempt to remove a Crew Lead when count is already 3 and none to replace → reject vs require swap op.
- Downgrade a passenger who previously had access — past `UsageEvent`s remain valid history (do not mutate).
- Resource `minTier` changed after provisioning — future access checks use current value; history unaffected.
- Deleting a resource/passenger — soft-delete vs hard-delete? Recommend **soft-delete** so audit trail is intact.
- Concurrency — if async, guard invariants (Crew Lead count) with transactional logic.
- Unknown tier string in input — reject at boundary, not deep in domain.
- Empty reports — return `[]`, not null.
- Clock — inject abstraction, never call `Date.now()` in domain.

---

## 8. Project Layout (as shipped)

```
passengerResourceManagement/
├── src/
│   ├── domain/                          # pure, no I/O, no Date.now()
│   │   ├── actor.ts                     # discriminated Actor type
│   │   ├── tier.ts                      # TIERS, rank(), canAccess()
│   │   ├── passenger.ts
│   │   ├── resource.ts
│   │   ├── crew-lead.ts
│   │   ├── usage-event.ts
│   │   ├── admin-event.ts
│   │   ├── errors.ts                    # closed DomainError sum
│   │   └── result.ts                    # Result<T,E>
│   ├── application/                     # services + ports
│   │   ├── crew-lead.service.ts
│   │   ├── passenger.service.ts
│   │   ├── resource.service.ts
│   │   ├── access.service.ts
│   │   ├── reporting.service.ts
│   │   ├── audit-emitter.ts             # shared admin-event emitter
│   │   ├── guards.ts                    # requireCrewLead()
│   │   ├── admin-event-sink.ts          # port
│   │   ├── usage-event-sink.ts          # port (write)
│   │   └── usage-event-source.ts        # port (read)
│   ├── infrastructure/                  # in-memory adapters + Clock
│   │   ├── clock.ts                     # Clock, systemClock, FakeClock
│   │   ├── in-memory-admin-event-sink.ts
│   │   └── in-memory-usage-event-sink.ts
│   └── interface/
│       ├── cli.ts                       # 3-line executable entrypoint
│       ├── demo.ts                      # scripted scenario (testable)
│       └── composition-root.ts          # buildApp() — all DI here
├── tests/
│   ├── unit/                            # one spec file per aggregate
│   │   ├── tier-policy.spec.ts
│   │   ├── crew-lead.spec.ts
│   │   ├── passenger.spec.ts
│   │   ├── resource.spec.ts
│   │   ├── access.spec.ts
│   │   ├── audit.spec.ts
│   │   ├── reporting.spec.ts
│   │   └── guards.spec.ts
│   └── integration/
│       └── demo.spec.ts
├── specs/                               # 01..07 — drive implementation
├── docs/                                # plan + IMPROVEMENTS notes
├── .github/workflows/ci.yml
├── .nvmrc                               # 24.15.0
├── eslint.config.mjs
├── vitest.config.ts                     # 100% coverage thresholds
├── package.json
├── tsconfig.json
└── README.md
```

---

## 9. README Requirements (must-have for submission)
- Problem statement + assumptions.
- How to run & test (`npm i`, `npm test`, `npm start`).
- Architecture overview + diagram.
- Design decisions & trade-offs.
- Level 1 / 2 / 3 feature checklist with status.
- Example commands or API calls.
- CI badge.

---

## 10. Implementation Milestones
1. **Bootstrap**: repo, TS, lint, test runner, CI pipeline, one trivial passing test.
2. **Level 1**: domain + services + in-memory repo + CLI or seed script; full test suite green.
3. **Level 2**: access validation + tier mutation + audit log; tests green.
4. **Level 3**: reporting services + analytics; tests green.
5. **Polish**: README, diagrams, sample demo script, final review.

---

## 11. Resolved Decisions
- **Interface:** CLI — scripted `runDemo()` + `cli.ts` entrypoint.
- **Persistence:** in-memory sinks behind ports; JSON/DB can be added as
  an adapter without touching domain or application layers.
- **Authentication:** simulated via an `Actor` discriminated union
  passed into every service method; validated at service boundary.
- **Language:** TypeScript 5.x, ESM, strict.
- **Crew Lead lifecycle:** bootstrap-only (exactly 3). No runtime
  add/remove — the invariant can never be violated.
- **Resource capacities:** out of scope (not in the brief).

---

## 12. "Done" Criteria — Status
- [x] All three levels have passing tests (129 unit + integration on
  the server; +6 on the web sub-project).
- [x] CI green on a fresh clone (`typecheck` + `lint` + `test:coverage`).
- [x] README quickstart: `nvm use && npm ci && npm test` (< 60 seconds).
- [x] Code demonstrates: TDD (spec-ID-tagged commits), clean
  architecture (domain → application → infrastructure → interface),
  clear naming, small focused modules, no leaky abstractions.
- [x] All three §13 above-and-beyond extras delivered (persistence,
  REST API, React UI).

---

## 13. Above-and-beyond — Status
All three optional extras are **delivered**. Each was added on its own
feature branch, merged via `--no-ff`, and landed without changing the
domain layer.

- [x] **JSON file persistence adapter** —
  [`specs/08-persistence.md`](../specs/08-persistence.md) (`PE-R1..R6`).
  JSONL admin + usage event sinks behind the existing ports; wired
  through `buildApp({ adminSink, usageSink })`. Merged as `47542d8`.
- [x] **REST layer (Fastify)** —
  [`specs/09-http.md`](../specs/09-http.md) (`HT-R1..R6`). Thin adapter
  over the application services; `npm run serve` starts the API.
  Merged as `ef18253`.
- [x] **Interactive React UI against the live REST API** —
  [`specs/11-web-interactive.md`](../specs/11-web-interactive.md)
  (`WB-R1..R6`). The initial static-snapshot page (originally
  `specs/10-web.md`) was superseded by a full SPA that drives every
  administrative and access-check action over HTTP (CORS enabled on
  the server). Isolated `web/` sub-project (Vite + React 18); Vite
  dev server proxies `/api/*` to `http://localhost:3000`.

Guardrails honoured:
- Core (Levels 1–3) was green before any of these started.
- Each addition has its own spec file (`specs/08..11`) written first.
- Domain tests were not modified; 100 % coverage maintained throughout.

---

## 14. Submission requirements (from challenge email)
The reviewer expects a ZIP (or Drive link) and will judge the code
**as if written by an experienced engineer** — AI usage is allowed and
expected, but does not lower the bar.

### Explicit grading values
- **SOLID principles** — apply where they reduce coupling; do not
  over-engineer.
- **Test-driven development** — red → green → refactor visible in commits.
- **Clean, readable code** — small functions, clear names, no dead code.
- **OOP & design patterns where appropriate** — services as classes with
  injected ports; Repository, Strategy/Policy, and Result patterns are
  natural fits here. Do not introduce patterns for their own sake.
- **Reviewer DX** — "assume someone else will read, run, and review your
  solution and make that as easy as possible."

### Mandatory deliverables in the ZIP
- `README.md` with:
  - One-paragraph problem statement.
  - **Quickstart**: `nvm use && npm ci && npm test` (≤ 3 commands).
  - Architecture diagram (the layered ASCII block is enough).
  - Spec → test → code traceability table (link to `specs/`).
  - Level 1 / 2 / 3 feature checklist with status.
  - **Design decisions & trade-offs** section.
  - **AI usage disclosure** (see below).
- `AGENTS.md` (already present) — engineering conventions.
- `specs/` directory (already present) — drives implementation.
- `.github/workflows/ci.yml` (already present) — typecheck + lint + test.
- `.nvmrc` (already present) — pins Node LTS.
- Clean git history with conventional commits, signed where possible.
- No `node_modules/` in the ZIP. Include `package-lock.json`.

### AI usage disclosure (required by email)
Add a section to `README.md` titled `## AI Usage Disclosure` covering:
- Tools used (e.g., GitHub Copilot in agent mode, model name).
- Where AI helped most (spec drafting, test scaffolding, boilerplate).
- What was reviewed/rewritten by hand (domain rules, invariants,
  service boundaries).
- What was rejected and why (e.g., over-engineered patterns, unsafe
  shortcuts).
- Verification done independently of the AI (running tests, reading
  diffs, manual edge-case reasoning).

### Pre-submission checklist
- [ ] `nvm use && npm ci && npm test` succeeds on a fresh clone.
- [ ] `npm run typecheck` and `npm run lint` are clean.
- [ ] CI badge in README is green.
- [ ] All public exports have purpose-driven names; no commented-out code.
- [ ] No secrets, tokens, or personal paths committed.
- [ ] README quickstart verified by following it line by line.
- [ ] AI Usage Disclosure section present and honest.
- [ ] ZIP excludes `node_modules`, `dist`, `coverage`, `.DS_Store`,
  `.git/objects/pack/*` if size matters (keep `.git` for history if
  reviewer values it; otherwise strip).


