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

## 3. Domain Model (first cut)

```
CrewLead      { id, name }
Passenger     { id, name, tier: Silver|Gold|Platinum }
Resource      { id, name, category, minTier: Silver|Gold|Platinum }
UsageEvent    { id, passengerId, resourceId, timestamp, outcome: ALLOWED|DENIED }
AdminEvent    { id, crewLeadId, action, targetId, timestamp, details }
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
- **TierPolicy**: `Silver < Gold < Platinum` ranking; `canAccess(passengerTier, resourceMinTier)`.
- **CrewLeadPolicy**: enforce count invariant.
- **AuditPolicy**: every access attempt + admin mutation produces an event.

---

## 5. Proposed Tech Stack
Given the JD (Node.js / Python / Go / TS / React):

**Recommended:** **TypeScript + Node.js** with:
- Core: TypeScript, strict mode
- Tests: Vitest or Jest (TDD)
- Lint/format: ESLint + Prettier
- Optional HTTP: Express/Fastify (only if REST layer is requested)
- CI: GitHub Actions (lint + test on PR)

**Why:** aligns with stack in JD, fast to demonstrate TDD + clean architecture without framework bloat.

*(Alternative: Python + pytest, or Go + stdlib + testing — choose one.)*

---

## 6. TDD Plan (red → green → refactor)

### Level 1 tests
- [ ] `TierPolicy.canAccess` — matrix of tier vs minTier.
- [ ] `CrewLeadService.add` — rejects 4th lead.
- [ ] `PassengerService.create` — assigns tier; validates inputs.
- [ ] `ResourceService.create` — sets minTier.
- [ ] `PassengerService.listAccessibleResources(passengerId)` — returns correctly filtered set (with inheritance).

### Level 2 tests
- [ ] `AccessService.useResource` — allowed for Platinum on Luxury O2 Pod.
- [ ] `AccessService.useResource` — denied for Silver on Adv. Medical Bay.
- [ ] `PassengerService.changeTier` — upgrade/downgrade takes effect on next `useResource`.
- [ ] Audit log — entry created per attempt (allowed + denied).

### Level 3 tests
- [ ] `ReportingService.personalHistory(passengerId)` — chronological.
- [ ] `ReportingService.aggregateByTier()` — counts grouped by Silver/Gold/Platinum.
- [ ] `ReportingService.topResources(n)` — ranking correctness + ties.

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

## 8. Project Layout (proposed)

```
passengerResourceManagement/
├── src/
│   ├── domain/
│   │   ├── tier.ts
│   │   ├── passenger.ts
│   │   ├── resource.ts
│   │   ├── crew-lead.ts
│   │   └── policies/access-policy.ts
│   ├── application/
│   │   ├── crew-lead.service.ts
│   │   ├── passenger.service.ts
│   │   ├── resource.service.ts
│   │   ├── access.service.ts
│   │   └── reporting.service.ts
│   ├── infrastructure/
│   │   ├── in-memory-repos.ts
│   │   └── clock.ts
│   └── interface/
│       └── cli.ts           (or http/)
├── tests/
│   ├── unit/
│   └── integration/
├── .github/workflows/ci.yml
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

## 11. Open Questions (confirm with interviewer / decide explicitly)
- Interface: **CLI, REST, or library-only**? (CLI is fastest to demo.)
- Persistence: **in-memory is acceptable** unless otherwise stated.
- Authentication: simulated (pass actor id) vs real auth?
- Language preference: TypeScript chosen — confirm.
- Should removal of a Crew Lead require simultaneous replacement?
- Are resource capacities (concurrent users) in scope? (Not in the PDF — assume **no** unless stated.)

---

## 12. "Done" Criteria
- All three levels have passing tests (unit + a few integration).
- CI is green on a fresh clone.
- README lets a reviewer run everything in < 2 minutes.
- Code demonstrates: TDD, clean architecture, clear naming, small focused modules, no leaky abstractions.
