# 12. Demo seed (`DS`)

A built-in canonical demo world drawn straight from the requirements
glossary (specs/00) so reviewers and humans can poke at the system
without typing fixture data by hand.

## Scope

- Pure helper in [`src/interface/seed.ts`](../src/interface/seed.ts)
  that consumes an `AppContext` and bootstraps the canonical
  population.
- Optional `--seed` flag (or `PRMS_SEED=1`) on `npm run serve` so the
  REST API starts pre-populated.
- A "Load demo data" button in the React UI that achieves the same
  result over HTTP for an already-running server (composes the same
  endpoints — no new server route).

Non-goals:

- No new HTTP endpoint. The seed helper runs server-side at boot;
  the web UI re-uses the existing `/api/*` endpoints.
- Seed data is intentionally tiny — just enough to demonstrate the
  tier matrix and hand-test access checks.

## Canonical world

Three Crew Leads:

| Id    | Name  |
| ----- | ----- |
| `CL1` | Alice |
| `CL2` | Bob   |
| `CL3` | Carol |

Three Passengers spanning every tier:

| Id   | Name | Tier     |
| ---- | ---- | -------- |
| `P1` | Ada  | Silver   |
| `P2` | Bea  | Gold     |
| `P3` | Cai  | Platinum |

Six Resources from the glossary:

| Id        | Name           | Category   | minTier  |
| --------- | -------------- | ---------- | -------- |
| `R-food`  | Food Station   | nutrition  | Silver   |
| `R-pod`   | Sleeping Pod   | rest       | Silver   |
| `R-cabin` | Cabin Suite    | rest       | Gold     |
| `R-med`   | Med Bay        | health     | Gold     |
| `R-o2`    | Luxury O2 Pod  | oxygen     | Platinum |
| `R-vip`   | VIP Lounge     | leisure    | Platinum |

## Rules

- **DS-R1 — Helper is idempotent.**
  `seedDemoWorld(app)` checks `crewLeads.list()`, `passengers.list()`
  and `resources.list()` before each insert. Replaying it must not
  throw and must not produce duplicate audit events for entities that
  already exist.

- **DS-R2 — Returns whether anything changed.**
  Returns `true` when at least one entity was created, `false` when
  the world was already complete. Call sites use the boolean to log
  appropriately.

- **DS-R3 — Goes through the public service API.**
  Uses `crewLeads.bootstrap`, `passengers.create`, `resources.create`
  exactly like a CLI / HTTP caller would. No infrastructure imports
  beyond the composition root, no direct sink writes. Audit events
  flow through the normal `AuditEmitter`.

- **DS-R4 — Server flag is opt-in.**
  `npm run serve` boots empty by default. Seeding happens only when
  `--seed` is present in `process.argv` or `PRMS_SEED=1` is set in
  the environment. Boot logs a one-line summary on stderr.

- **DS-R5 — UI button reuses existing endpoints.**
  The "Load demo data" button in the React app calls
  `POST /api/crew-leads/bootstrap`, then `POST /api/passengers` and
  `POST /api/resources` for each seed item. It is idempotent on the
  client too: existing entities surface as `Conflict` errors which
  the UI swallows silently and continues.

## Scenarios

- **DS-S1: empty world → fully populated.**
  Fresh `AppContext`, call `seedDemoWorld` once. Expect:
  `crewLeads.list().length === 3`, `passengers.list().length === 3`,
  `resources.list().length === 6`, return value `true`.

- **DS-S2: replay is a no-op.**
  Call `seedDemoWorld` twice. Second call returns `false`; counts
  unchanged; admin event count after the second call equals the
  count after the first.

- **DS-S3: server `--seed` flag.**
  Boot the HTTP app with `seedDemoWorld` applied; `GET /api/passengers`
  returns the three seeded passengers; `GET /api/resources?tier=Silver`
  returns `R-food` and `R-pod`.
