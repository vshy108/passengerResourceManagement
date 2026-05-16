# HTTP Contract Snapshot

The REST API publishes a lightweight contract snapshot instead of OpenAPI for now. The snapshot is small enough to keep beside the Fastify adapter and strict enough for route drift detection.

Source of truth: `src/interface/http/contract.ts`.

Test: `tests/integration/http-contract.spec.ts` verifies every documented method/path is registered by `createHttpApp` and that every mutating route documents its request body.

## Contract Policy

- Additive response fields are allowed.
- Renaming paths, changing methods, or removing documented fields requires updating the contract and tests in the same change.
- Domain errors are returned as `{ "error": <DomainError> }` with status codes from the HTTP adapter.
- Access denials must remain `403` and still emit `UsageEvent` history.
