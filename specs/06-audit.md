# 06 — Audit

**Spec ID prefix:** `AU`

## Purpose
Capture an append-only audit trail of every administrative mutation
performed by a Crew Lead. Mirrors the passenger-side `UsageEvent` trail
(see specs/05-access.md).

## Inputs
- Existing services (`CrewLeadService`, `PassengerService`,
  `ResourceService`) emit events through an injected `AdminEventSink`
  (port).
- `Clock` provides timestamps.

## Outputs
- `AdminEvent`s recorded in the sink, in the order they occurred.

## Rules (normative)
- **AU-R1**: Every **successful** admin mutation emits exactly one
  `AdminEvent`. Failed operations (validation errors, not-found,
  unauthorised) emit **no** event.
- **AU-R2**: `AdminEvent` fields: `id`, `actorId` (Crew Lead id),
  `action`, `targetKind`, `targetId`, `timestamp`, `details?`.
- **AU-R3**: `action` is a closed string union covering every admin
  mutation:
  - `'CrewLeadBootstrapped'`, `'CrewLeadAdded'`, `'CrewLeadRemoved'`,
    `'CrewLeadReplaced'`
  - `'PassengerCreated'`, `'PassengerTierChanged'`, `'PassengerDeleted'`
  - `'ResourceCreated'`, `'ResourceMinTierChanged'`, `'ResourceDeleted'`
- **AU-R4**: Events are append-only — never updated or deleted (AU-I1).
- **AU-R5**: Timestamps come from the injected `Clock` (no `Date.now()`
  in services).
- **AU-R6**: The audit capability is optional — services accept an
  optional `AuditContext = { clock, sink, idGen }` (or, for services
  that already require a `Clock`, an `Omit<AuditContext, 'clock'>`).
  When omitted, services behave as before and emit nothing.

## Invariants
- **AU-I1**: Append-only trail.
- **AU-I2**: Event ordering matches mutation ordering.

## Acceptance scenarios

### Emission on success (AU-R1)
- **AU-S1**: When a Crew Lead creates a passenger, an event with
  `action='PassengerCreated'`, matching `actorId` and `targetId` is
  recorded.
- **AU-S2**: When a Crew Lead changes a passenger's tier, an event with
  `action='PassengerTierChanged'` is recorded with the new tier in
  `details`.
- **AU-S3**: When a Crew Lead soft-deletes a passenger, an event with
  `action='PassengerDeleted'` is recorded.
- **AU-S4**: When a Crew Lead creates a resource, an event with
  `action='ResourceCreated'` is recorded.
- **AU-S5**: When a Crew Lead changes a resource's min tier, an event
  with `action='ResourceMinTierChanged'` is recorded with the new tier
  in `details`.
- **AU-S6**: When a Crew Lead soft-deletes a resource, an event with
  `action='ResourceDeleted'` is recorded.
- **AU-S7**: `bootstrap(leads)` emits one `'CrewLeadBootstrapped'` event.
- **AU-S8**: `replace(outId, newLead)` emits one `'CrewLeadReplaced'`
  event referencing the new lead.

### Silence on failure (AU-R1)
- **AU-S9**: When a non-Crew-Lead tries to create a passenger, no
  `AdminEvent` is recorded.
- **AU-S10**: When `changeTier` targets an unknown passenger, no event is
  recorded.

### Ordering (AU-I2)
- **AU-S11**: Create passenger then change tier then soft-delete — the
  sink lists the three events in that order.

## Out of scope
- Event replay / projection.
- External logging transports (Kafka, syslog).
- Structured query / filtering (future reporting slice).

## Traceability
| Rule | Test(s) |
|------|---------|
| AU-R1 / AU-R3 | AU-S1..AU-S8, AU-S9, AU-S10 |
| AU-R2 | AU-S1..AU-S8 |
| AU-I2 | AU-S11 |
