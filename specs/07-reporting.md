# 07 — Reporting

**Spec ID prefix:** `RP`

## Purpose
Read-only queries over the `UsageEvent` trail (see specs/05-access.md).
Reporting does not mutate state and does not emit events of its own.

## Inputs
- A `UsageEventSource` (port) — any object exposing
  `list(): readonly UsageEvent[]`. `UsageEventSink` satisfies this.

## Rules (normative)
- **RP-R1**: `personalHistory(passengerId)` returns all `UsageEvent`s for
  that passenger, in chronological order (ascending `timestamp`). Empty
  array when the passenger has no events — never an error.
- **RP-R2**: `aggregateByTier()` returns a map `tier -> { allowed, denied }`
  counting attempts at which the passenger was **at that tier**
  (`tierAtAttempt`), not their current tier. Every tier in the union
  appears in the result (zeros when absent).
- **RP-R3**: `topResources(n)` returns the `n` resources with the most
  **allowed** uses, sorted descending by count. Ties are broken by
  `resourceId` ascending (deterministic). `n <= 0` returns `[]`.
- **RP-R4**: Denied attempts do not count toward `topResources`.
- **RP-R5**: Reporting is a pure read over the source — calling any
  method twice with the same source yields identical output.

## Invariants
- **RP-I1**: Reporting does not modify the event source.
- **RP-I2**: Output is deterministic given the input events.

## Acceptance scenarios

### Personal history (RP-R1)
- **RP-S1**: Given a passenger with three events (two allowed, one
  denied), `personalHistory(id)` returns all three in insertion order.
- **RP-S2**: Given no events for an unknown passenger, returns `[]`.
- **RP-S3**: Events for other passengers are excluded.

### Aggregate by tier (RP-R2)
- **RP-S4**: Given two allowed-at-Silver and one denied-at-Silver event,
  `aggregateByTier()['Silver']` equals `{ allowed: 2, denied: 1 }`.
- **RP-S5**: Tiers with no events still appear with `{ allowed: 0,
  denied: 0 }`.
- **RP-S6**: A tier change on the passenger does **not** reclassify past
  events — snapshots rule (per AC-R5).

### Top resources (RP-R3, RP-R4)
- **RP-S7**: Given allowed counts R1=3, R2=1, R3=2, `topResources(2)`
  returns `[R1, R3]`.
- **RP-S8**: Denied events are ignored: R1 denied×5 + R2 allowed×1 →
  `topResources(1) = [R2]`.
- **RP-S9**: Ties break by `resourceId` ascending.
- **RP-S10**: `topResources(0)` returns `[]`.

## Out of scope
- Date range filters (future).
- Resource metadata joins (category, name).
- Persistence / streaming.

## Traceability
| Rule | Test(s) |
|------|---------|
| RP-R1 | RP-S1, RP-S2, RP-S3 |
| RP-R2 | RP-S4, RP-S5, RP-S6 |
| RP-R3 / RP-R4 | RP-S7, RP-S8, RP-S9, RP-S10 |
