# 05 — Access

**Spec ID prefix:** `AC`

## Purpose
Define the runtime permission check that gates passenger use of resources,
and the audit event emitted on every attempt (allowed or denied).

## Inputs
- `actor: Actor` — the passenger attempting use.
- `resourceId: ResourceId`
- Access to `PassengerService` and `ResourceService` (via DI).
- A `UsageEventSink` (port) for emitting events.

## Outputs
- `Result<UsageEvent, DomainError>` — `ok` for allowed, `err` for denied
  (the denial **still emits** a `UsageEvent` with `outcome = 'DENIED'`).

## Rules (normative)
- **AC-R1**: `useResource(actor, resourceId)` is only callable by an actor
  of kind `'Passenger'`. A Crew Lead actor is rejected with
  `UnauthorizedActor` and **no UsageEvent is emitted** (admins do not
  consume passenger resources).
- **AC-R2**: The passenger must exist and not be soft-deleted; otherwise
  `PassengerNotFound` is returned. **No UsageEvent is emitted** (the
  passenger is not a real subject).
- **AC-R3**: The resource must exist and not be soft-deleted; otherwise
  `ResourceNotFound` is returned. **No UsageEvent is emitted** (the
  resource is not a real subject).
- **AC-R4**: Allowed iff `canAccess(passenger.tier, resource.minTier)`.
  - On allowed: emit `UsageEvent { outcome: 'ALLOWED', … }` and return
    `ok(event)`.
  - On denied: emit `UsageEvent { outcome: 'DENIED', … }` and return
    `err({ kind: 'AccessDenied', … })`. The event is recorded **before**
    the result is returned.
- **AC-R5**: `UsageEvent` fields: `id`, `passengerId`, `resourceId`,
  `tierAtAttempt`, `minTierAtAttempt`, `timestamp`, `outcome`.
  `tierAtAttempt` and `minTierAtAttempt` are snapshots — they do not
  change if the passenger or resource is later mutated.
- **AC-R6**: Tier changes take effect on the **next** call to
  `useResource`. Past `UsageEvent`s remain unchanged.
- **AC-R7**: Event timestamps come from the injected `Clock`. Domain code
  never calls `Date.now()`.

## Invariants
- **AC-I1**: For every `useResource` call where the subject and target
  exist, exactly one `UsageEvent` is emitted (allowed or denied).
- **AC-I2**: `UsageEvent` is append-only — never updated or deleted.

## Errors
- **AC-E1** `UnauthorizedActor`: caller is not a passenger.
- **AC-E2** `AccessDenied`: tier insufficient.
- **AC-E3** `PassengerNotFound`: subject passenger missing or soft-deleted.
- **AC-E4** `ResourceNotFound`: target resource missing or soft-deleted.

## Acceptance scenarios (Given / When / Then)

### Authorization (AC-R1)
- **AC-S1**: Given a Crew Lead actor, When `useResource(R1)` is called,
  Then it returns `UnauthorizedActor` and the audit sink received zero
  events.

### Subject / target validity (AC-R2, AC-R3)
- **AC-S2**: Given an unknown passenger id, When `useResource` is called,
  Then it returns `PassengerNotFound` and the sink received zero events.
- **AC-S3**: Given a soft-deleted passenger, When `useResource` is called,
  Then it returns `PassengerNotFound` and the sink received zero events.
- **AC-S4**: Given a known passenger and an unknown resource id,
  When `useResource` is called, Then it returns `ResourceNotFound` and the
  sink received zero events.
- **AC-S5**: Given a known passenger and a soft-deleted resource,
  When `useResource` is called, Then it returns `ResourceNotFound` and the
  sink received zero events.

### Allow / deny (AC-R4)
- **AC-S6**: Given a Platinum passenger and a Silver resource, When
  `useResource` is called, Then it returns `ok` with `outcome = 'ALLOWED'`
  and the sink received exactly one `ALLOWED` event for that pair.
- **AC-S7**: Given a Silver passenger and a Gold resource, When
  `useResource` is called, Then it returns `err(AccessDenied)` and the
  sink received exactly one `DENIED` event for that pair.

### Snapshots (AC-R5, AC-R6)
- **AC-S8**: Given a Silver passenger uses a Silver resource (allowed),
  When the passenger is later upgraded to Platinum, Then the original
  event still has `tierAtAttempt = 'Silver'` (never mutated).
- **AC-S9**: Given a Silver passenger is denied a Gold resource at t0,
  When the passenger is later upgraded to Gold and uses the same resource
  at t1, Then the t1 call returns `ok(ALLOWED)` and the t0 event still
  records `outcome = 'DENIED'`.

### Determinism (AC-R7)
- **AC-S10**: Given a `FakeClock` fixed at T, When `useResource` is
  called, Then the emitted event's `timestamp` equals T.

## Out of scope
- Rate limiting / cooldowns.
- Capacity / concurrent-use checks.
- Notifications / side-effects beyond the audit sink.

## Traceability
| Rule | Test(s) | Implementation |
|------|---------|----------------|
| AC-R1 | AC-S1 | `application/access.service.ts` |
| AC-R2 | AC-S2, AC-S3 | ditto |
| AC-R3 | AC-S4, AC-S5 | ditto |
| AC-R4 | AC-S6, AC-S7 | ditto |
| AC-R5 / AC-R6 / AC-I2 | AC-S8, AC-S9 | ditto |
| AC-R7 | AC-S10 | ditto |
