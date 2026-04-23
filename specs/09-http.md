# 09 — Minimal REST API

**Status:** Optional / above-and-beyond (plan §13).

A thin HTTP adapter over the existing application services. Uses
**Fastify** for type-friendly routing, minimal boilerplate, and
built-in JSON handling. No new domain concepts.

## Glossary reuse
Re-uses `CrewLead`, `Passenger`, `Resource`, `UsageEvent`, `AdminEvent`,
`Actor`, `Tier` from earlier specs. The HTTP layer only translates
`Result<T, DomainError>` into HTTP status codes and JSON bodies.

## Rules

- **HT-R1** The HTTP layer lives in `src/interface/http/` and depends
  only on services from the composition root. No domain imports
  outside of type aliases.
- **HT-R2** A single factory `createHttpApp(ctx)` returns a configured
  Fastify instance given an `AppContext`; tests and production share
  the same factory.
- **HT-R3** The caller identifies itself via an `x-actor` header
  formatted as `<kind>:<id>` (e.g. `CrewLead:CL1`). Missing or
  malformed header → `400 Bad Request`.
- **HT-R4** `Result<T, DomainError>` translates to status codes:
  - `ok` → `200` (GET / list) or `201` (create / action).
  - `UnauthorizedActor` → `403`.
  - `PassengerNotFound` / `ResourceNotFound` / `CrewLeadNotFound` → `404`.
  - `PassengerAlreadyExists` / `ResourceAlreadyExists` /
    `CrewLeadCountInvalid` → `409`.
  - `AccessDenied` → `403` (but the usage event is still recorded).
  - Any other domain error → `400`.
- **HT-R5** Request bodies are validated at the boundary via Fastify's
  JSON schema / manual type guards. Unknown tier strings are rejected
  as `400` before reaching a service.
- **HT-R6** JSON responses never leak `Result` wrapping — `ok` payloads
  are returned as the raw entity or `{ error: { kind, ... } }` on
  failure.

## Routes (v1)

| Method | Path                           | Purpose                         |
| ------ | ------------------------------ | ------------------------------- |
| GET    | `/health`                      | liveness probe                  |
| POST   | `/crew-leads/bootstrap`        | CL-R1: seed exactly 3 leads     |
| GET    | `/crew-leads`                  | list crew leads                 |
| POST   | `/passengers`                  | PS-R1: create passenger         |
| GET    | `/passengers`                  | list active passengers          |
| GET    | `/passengers/:id`              | fetch (including soft-deleted)  |
| PATCH  | `/passengers/:id/tier`         | PS-R3: change tier              |
| DELETE | `/passengers/:id`              | PS-R5: soft-delete              |
| POST   | `/resources`                   | RS-R1: create resource          |
| GET    | `/resources`                   | list active resources           |
| GET    | `/resources?tier=Gold`         | RS / access-filter view         |
| POST   | `/access/use`                  | AC-R1: attempt use              |
| GET    | `/reports/history/:passengerId`| RP-R1                           |
| GET    | `/reports/aggregate-by-tier`   | RP-R2                           |
| GET    | `/reports/top-resources?n=3`   | RP-R3                           |

## Scenarios

- **HT-S1** `GET /health` → `200 { status: "ok" }`.
- **HT-S2** `POST /passengers` with a non-CrewLead actor header → `403`.
- **HT-S3** `POST /passengers` with unknown tier → `400`.
- **HT-S4** `POST /access/use` on a disallowed resource → `403` **and**
  the usage event is recorded (check via the admin events endpoint or
  a subsequent `GET /reports/history/:id`).
- **HT-S5** `POST /crew-leads/bootstrap` with 2 leads → `409
  CrewLeadCountInvalid`.
- **HT-S6** Missing `x-actor` header → `400`.

## Out of scope

- Authentication / authorization beyond the simulated `x-actor` header.
- OpenAPI / Swagger emission (could be added trivially later).
- CORS — the reviewer runs this locally.
- Pagination — event counts are tiny in-memory in this demo.
