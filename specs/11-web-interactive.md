# 11. Interactive Web UI (`WI`)

Live, read/write React console that talks to the Fastify REST API
(specs/09). Supersedes the snapshot-based read-only page from
specs/10.

## Scope

- Single-page React app under [`web/`](../web).
- Talks to the running API over HTTP — no snapshot files, no
  duplicated domain state.
- Exercises every action the API exposes: bootstrap, passenger CRUD +
  tier change, resource create/list, access `use`, and all three
  reports.
- Kept as an isolated sub-project (own `package.json`, own TS config,
  own Vitest). Domain / server tests stay untouched.

Non-goals (keep the scope finite):

- No authentication, no session storage, no user profiles.
  "Who am I?" is a dropdown picker held in React state.
- No routing library — one page, collapsible panels.
- No production hosting — the UI is meant to be run locally alongside
  `npm run serve`.

## Rules

- **WI-R1 — API client is the only I/O boundary.**
  All HTTP calls live in [`web/src/api.ts`](../web/src/api.ts). UI
  components never call `fetch` directly. The client returns typed
  results and maps non-2xx responses to a typed `ApiError`
  (`{ status, error }` where `error` is the `DomainError` payload from
  HT-R4 when available, otherwise `{ kind: 'Http', message }`).

- **WI-R2 — Actor is explicit.**
  Every mutating call (create / change-tier / delete / use) requires
  an `Actor` chosen in the UI. The client attaches it as
  `x-actor: <Kind>:<id>` per HT-R3. Reads do not send the header.

- **WI-R3 — Tier rank, not string equality.**
  Where the UI does any client-side comparison (e.g. disabling a
  "Use" button for resources the current passenger cannot reach) it
  relies on the shared rank order `Silver < Gold < Platinum`, mirrored
  locally in [`web/src/tier.ts`](../web/src/tier.ts).

- **WI-R4 — Isolated sub-project.**
  No imports from the server's `src/`. Domain shapes are duplicated in
  [`web/src/types.ts`](../web/src/types.ts); the server is the source
  of truth at runtime.

- **WI-R5 — Empty states are first-class.**
  Before bootstrap the UI shows only the bootstrap form. Lists render
  a visible "— none —" row when empty rather than blank space.

## Scenarios

- **WI-S1 — Bootstrap flow.** With an empty backend, submitting three
  `{id,name}` leads in the bootstrap panel makes the panel disappear
  and the actor dropdown lists all three leads.

- **WI-S2 — Create passenger.** Acting as a crew lead, filling the
  passenger form with `{id, name, tier}` appends the passenger to the
  list. The server's `AdminEvent` timestamp and id are accepted
  verbatim.

- **WI-S3 — Tier filter.** Selecting a tier in the resources filter
  calls `GET /resources?tier=<T>` and the list reflects the server's
  response (no client-side hiding).

- **WI-S4 — Denied access emits an event.** Acting as a Silver
  passenger and pressing "Use" on a Gold resource surfaces the
  `AccessDenied` error from the API; `GET /reports/history/:id` then
  includes the DENIED entry.

- **WI-S5 — Reports render.** The reports panel calls
  `/reports/aggregate-by-tier` and `/reports/top-resources?n=3` and
  renders both; switching the selected passenger refetches
  `/reports/history/:id`.

## Invariants

- **WI-I1** — The UI holds no derived copy of resource ACL state; all
  tier / access decisions come from the server response.
- **WI-I2** — An `ApiError` never crashes the page; panels show an
  inline error and stay usable.

## Coverage

Unit tests: [`web/src/api.spec.ts`](../web/src/api.spec.ts) stub
`global.fetch` to cover the success / error mapping paths (WI-R1) and
the actor-header behaviour (WI-R2).

Integration with a real server is covered on the server side by
[`tests/integration/http.spec.ts`](../tests/integration/http.spec.ts).
