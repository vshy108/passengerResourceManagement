# Spaceship X26 — Passenger Resource Management System

TypeScript implementation of the PRMS code challenge for the Everest
Engineering Senior Full Stack Engineer role. Built Spec-Driven and
Test-First: every behaviour is traceable from a spec scenario through a
named test into the code.

**Test coverage: 100 %** (statements / branches / functions / lines —
enforced by thresholds in [vitest.config.ts](./vitest.config.ts)).

## Quickstart (copy/paste)

```bash
nvm use           # Node 24.15.0 (pinned in .nvmrc)
npm ci            # deterministic install
npm test          # run the full suite
```

Optional:

```bash
npm run typecheck       # strict TS compile check
npm run lint            # ESLint flat config, --max-warnings=0
npm run test:coverage   # full suite with 100% threshold enforcement
npm run demo            # build + run a scripted end-to-end scenario
```

### Scripts

| Command                 | What it does                                        |
| ----------------------- | --------------------------------------------------- |
| `npm test`              | Vitest one-shot run of all unit + integration tests |
| `npm run test:watch`    | Vitest in watch mode                                |
| `npm run test:coverage` | Vitest with v8 coverage; fails below 100 %          |
| `npm run typecheck`     | `tsc --noEmit` with strict settings                 |
| `npm run lint`          | ESLint (flat config), `--max-warnings=0`            |
| `npm run build`         | Emit JS into `dist/`                                |
| `npm run demo`          | Build then run the scripted CLI demo                |
| `npm run serve`         | Build + start the Fastify REST API (default :3000)  |
| `npm start`             | Run the compiled CLI                                |

All commands complete in under a minute on a modern laptop, with zero
network or filesystem side-effects in tests.

## What it does

- **Crew Leads** (exactly three) administer the system.
- **Passengers** have a tier: `Silver` < `Gold` < `Platinum`.
- **Resources** carry a minimum tier.
- A passenger can use a resource iff their tier ≥ the resource's min
  tier. Every attempt — allowed or denied — is recorded as a
  `UsageEvent`.
- Every admin mutation is recorded as an `AdminEvent`.
- `ReportingService` answers: personal history, aggregate counts by
  tier, top-N resources by allowed use.

### Optional extras (specs 08–09, 11)

- **JSON file persistence** — swap the in-memory event sinks for
  durable JSONL adapters via `buildApp({ adminSink, usageSink })`.
- **REST API** — `npm run serve` starts a Fastify adapter (CORS
  enabled) over the same services (see
  [specs/09-http.md](./specs/09-http.md)).
- **Interactive Web UI** — a React SPA under [`web/`](./web) that
  drives the live REST API — bootstrap crew leads, manage
  passengers / resources, run access checks, view reports. Run
  locally with the API on one terminal and the Vite dev server on
  another:
  ```bash
  # terminal 1
  npm run serve              # API on http://localhost:3000
  # terminal 2
  cd web && npm ci && npm run dev   # UI on http://localhost:5173
  ```
  The Vite dev server proxies `/api/*` to port 3000, so no extra
  config is required. See [specs/11-web-interactive.md](./specs/11-web-interactive.md).

## Architecture

```
interface  →  application  →  domain
                 ↑
           infrastructure
```

- **`src/domain/`** — pure types & rules. No I/O, no `Date.now()`.
- **`src/application/`** — services & ports (`UsageEventSink`,
  `AdminEventSink`). Depends only on `domain/` + ports.
- **`src/infrastructure/`** — concrete adapters (`Clock`, in-memory
  event sinks).
- **`src/interface/`** — composition root + CLI. Wires everything; no
  business logic.

Decisions captured in [AGENTS.md](./AGENTS.md) (house rules, SOLID,
testing, commit style) and [specs/](./specs/) (rules, invariants,
scenarios).

## Traceability

| Area          | Spec                                    | Tests                              | Code                                    |
| ------------- | --------------------------------------- | ---------------------------------- | --------------------------------------- |
| Tier policy   | [01](./specs/01-tier-policy.md) `TP`    | [tier-policy.spec.ts](./tests/unit/tier-policy.spec.ts) | [domain/tier.ts](./src/domain/tier.ts)  |
| Crew Lead     | [02](./specs/02-crew-lead.md) `CL`      | [crew-lead.spec.ts](./tests/unit/crew-lead.spec.ts)     | [application/crew-lead.service.ts](./src/application/crew-lead.service.ts) |
| Passenger     | [03](./specs/03-passenger.md) `PS`      | [passenger.spec.ts](./tests/unit/passenger.spec.ts)     | [application/passenger.service.ts](./src/application/passenger.service.ts) |
| Resource      | [04](./specs/04-resource.md) `RS`       | [resource.spec.ts](./tests/unit/resource.spec.ts)       | [application/resource.service.ts](./src/application/resource.service.ts)   |
| Access        | [05](./specs/05-access.md) `AC`         | [access.spec.ts](./tests/unit/access.spec.ts)           | [application/access.service.ts](./src/application/access.service.ts)       |
| Audit         | [06](./specs/06-audit.md) `AU`          | [audit.spec.ts](./tests/unit/audit.spec.ts)             | (sink wired in all three admin services) |
| Reporting     | [07](./specs/07-reporting.md) `RP`      | [reporting.spec.ts](./tests/unit/reporting.spec.ts)     | [application/reporting.service.ts](./src/application/reporting.service.ts) |
| Persistence (opt) | [08](./specs/08-persistence.md) `PE` | [json-persistence.spec.ts](./tests/integration/json-persistence.spec.ts) | [infrastructure/json-file-admin-event-sink.ts](./src/infrastructure/json-file-admin-event-sink.ts), [infrastructure/json-file-usage-event-sink.ts](./src/infrastructure/json-file-usage-event-sink.ts) |
| HTTP API (opt) | [09](./specs/09-http.md) `HT`            | [http.spec.ts](./tests/integration/http.spec.ts)         | [interface/http/server.ts](./src/interface/http/server.ts), [interface/serve.ts](./src/interface/serve.ts) |
| Web UI (opt)  | [11](./specs/11-web-interactive.md) `WB` | [web/src/api.spec.ts](./web/src/api.spec.ts)             | [web/src/App.tsx](./web/src/App.tsx), [web/src/api.ts](./web/src/api.ts) |
| Composition   | —                                       | [demo.spec.ts](./tests/integration/demo.spec.ts)        | [interface/composition-root.ts](./src/interface/composition-root.ts)       |

Test names mirror scenario IDs — e.g. `it('AC-S7: Silver passenger +
Gold resource -> DENIED event', …)`.

## Design choices (the short version)

- **`Result<T, DomainError>`** over exceptions for expected failures.
  `throw` is reserved for programmer errors.
- **Branded IDs** (`PassengerId`, `ResourceId`, …) prevent cross-entity
  mix-ups at compile time.
- **Injected `Clock`** keeps domain + application deterministic; tests
  use `FakeClock`.
- **Ports + adapters** (`UsageEventSink`, `AdminEventSink`) — services
  depend on small interfaces; infrastructure provides in-memory
  implementations; swapping for a JSON file repo is additive.
- **Exhaustive checks** on `Tier` and `AdminAction` unions — new tier
  or action breaks the compile until every switch is updated.
- **Soft-delete** on `Passenger` and `Resource` so the audit trail
  remains meaningful.

Patterns intentionally **avoided**: singletons, service locators, deep
inheritance, "Manager"/"Helper" bags.

## Project layout

```
AGENTS.md                    engineering conventions
specs/                       numbered rule/scenario specs
src/
  domain/                    types + pure rules
  application/               services + ports
  infrastructure/            concrete adapters
  interface/                 composition root + CLI
tests/
  unit/                      one spec file per domain area
  integration/               end-to-end via composition root
.github/workflows/           CI
```

## AI Usage Disclosure

As permitted by the challenge guidelines, I used AI assistance while
building this solution.

**Tool:** GitHub Copilot Chat (Claude Opus 4.7) in VS Code Insiders.

**Where AI helped:**

- Scaffolding the initial TypeScript/Vitest/ESLint flat-config toolchain
  (package scripts, `tsconfig.json` split, CI workflow).
- Drafting spec files (`specs/01` — `specs/07`) in the rule /
  invariant / scenario format once I described the domain.
- Generating the first failing test batch for each slice before the
  implementation existed (red phase).
- Proposing initial implementations of each service which I then read,
  edited, and, in several cases, rewrote.
- Writing doc scaffolding for the `README.md` sections (this
  disclosure included).

**Where I drove / rewrote:**

- The clean-architecture layering and the decision to make event sinks
  a port (`UsageEventSink`, `AdminEventSink`) rather than embedding
  persistence in services.
- The "exactly 3 Crew Leads" invariant wording and the
  `bootstrap → add/remove/replace` protocol in `specs/02`.
- Snapshot semantics on `UsageEvent` (`tierAtAttempt`,
  `minTierAtAttempt`) — tier changes don't reclassify history.
- Tie-breaker rule in `ReportingService.topResources` (count desc then
  `resourceId` asc, for determinism).
- Choice of branded IDs + discriminated-union errors instead of
  exceptions.
- Final wiring in the composition root and the shape of the
  integration test.

**What I rejected:**

- Suggestions to throw `Error` in services (kept `Result<T, E>`).
- Suggestions to infer the actor from a global context (kept explicit
  `Actor` parameter at the service boundary).
- Suggestions to add generic "manager" classes and a dependency
  container — overkill for this scope.
- Attempts to emit audit events on **failed** operations — the spec
  (AU-R1) is explicit that failures are silent.

**Verification:** every AI-generated chunk was read, compiled with
`strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes`,
linted with `--max-warnings=0`, and exercised by the test suite
(129 tests on the server, +6 on the web sub-project, all green).
Commits are signed (GPG) and follow
Conventional Commits with one scenario or slice per commit.

## License

Submitted as a code challenge. Not for redistribution.
