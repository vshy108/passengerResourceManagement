# Passenger Resource Management Improvement Plan

This plan tracks follow-up slices for the TypeScript PRMS. Preserve the spec-driven workflow, strict TypeScript settings, 100% coverage threshold, and thin interface adapters.

## S1 — API Usage Examples

- [x] Add curl examples for bootstrap, passenger/resource administration, access checks, and reports.
- [x] Include both allowed and denied access attempts so `UsageEvent` behavior is visible.
- [x] Verify with: `npm run serve -- --seed` and the documented requests.

## S2 — Web UI Review Script

- [x] Add a reviewer path for the React UI that starts from a clean checkout and reaches the main workflows.
- [x] Include bootstrap, demo load, access check, and report inspection.
- [x] Verify with: `cd web && npm ci && npm run build`.

## S3 — Persistence Recovery Scenarios

- [x] Add integration scenarios for JSONL persistence restart/reload behavior.
- [x] Document what is durable, what is recomputed, and how corrupted event lines should be handled.
- [x] Verify with: `npm run test:coverage`.

## S4 — OpenAPI Or Contract Snapshot

- [x] Decide whether the REST API should publish an OpenAPI document or a lighter contract snapshot.
- [x] Add a test that detects accidental route or payload drift.
- [x] Link the contract from `README.md` and `CHEATSHEET.md`.

## S5 — Operational Demo Mode

- [x] Add a repeatable demo script that starts the API with seed data and exercises the main happy path.
- [x] Keep it non-interactive and safe for local runs.
- [x] Verify with: `npm run demo` or a new documented script.
