# Passenger Resource Management Cheatsheet

## Commands

```sh
nvm use
npm ci
npm test
npm run typecheck
npm run lint
npm run test:coverage
npm run demo
npm run demo:operational
npm run serve
npm run serve -- --seed
```

Run the interactive UI:

```sh
npm run serve
cd web && npm ci && npm run dev
```

## Domain Rules

- Exactly three Crew Leads administer the system.
- Passenger tiers order as `Silver < Gold < Platinum`.
- A passenger can access a resource when `passenger.tier >= resource.minTier`.
- Every access attempt emits a `UsageEvent`, allowed or denied.
- Successful admin mutations emit `AdminEvent` entries.
- Passenger and resource deletes are soft deletes so audit history remains meaningful.

## Architecture Boundary

```text
interface -> application -> domain
                 ^
           infrastructure
```

- `src/domain/`: pure types and rules.
- `src/application/`: services and ports.
- `src/infrastructure/`: clocks and event sinks.
- `src/interface/`: CLI, HTTP adapter, and composition root.
- `web/`: React thin client against the live REST API.

## API And Demo

- Start API: `npm run serve`.
- Seed canonical world: `npm run serve -- --seed` or `PRMS_SEED=1 npm run serve`.
- Run curl examples from `docs/api-usage-examples.md`.
- Validate HTTP route drift with `tests/integration/http-contract.spec.ts`.
- Run non-interactive API demo: `npm run demo:operational`.
- Vite proxies `/api/*` to `http://localhost:3000`.

## Review Gates

```sh
npm test
npm run typecheck
npm run lint
npm run test:coverage
cd web && npm test
cd web && npm run build
```

## Review Docs

- Web UI path: `docs/web-ui-review.md`.
- Persistence recovery: `docs/persistence-recovery.md`.
- HTTP contract: `docs/http-contract.md`.
- Operational demo: `docs/operational-demo.md`.
