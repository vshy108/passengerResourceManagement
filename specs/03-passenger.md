# 03 — Passenger

**Spec ID prefix:** `PS`

## Purpose
Define the Passenger lifecycle: creation, tier change (upgrade/downgrade),
and soft delete. Only Crew Leads may mutate passengers.

## Inputs
- `Passenger { id: PassengerId, name: string, tier: Tier, deletedAt?: ISOString }`
- An authenticated Crew Lead actor for every mutation.

## Outputs
- `Result<Passenger, DomainError>` from mutations.
- `readonly Passenger[]` from queries (active passengers by default).

## Rules (normative)
- **PS-R1**: `create(actor, passenger)` creates a passenger with the given
  tier. Only a Crew Lead may call this. A non-Crew-Lead actor is rejected.
  - Error: `UnauthorizedActor`.
- **PS-R2**: Passenger ids are unique among **active** passengers. Adding an
  existing active id is rejected.
  - Error: `PassengerAlreadyExists`.
- **PS-R3**: `changeTier(actor, id, newTier)` updates a passenger's tier.
  Only a Crew Lead may call this.
- **PS-R4**: `changeTier` to the same tier is a no-op success (idempotent).
- **PS-R5**: `softDelete(actor, id)` marks a passenger as deleted by
  stamping `deletedAt`. Only a Crew Lead may call this. Soft-deleted
  passengers do not appear in `list()` but remain resolvable by id for
  audit.
- **PS-R6**: Re-creating a passenger id that belongs to a soft-deleted
  passenger is allowed (the old record stays for audit).
- **PS-R7**: Operating on an unknown or soft-deleted id is rejected.
  - Error: `PassengerNotFound`.
- **PS-R8**: `list()` returns active passengers in insertion order.
- **PS-R9**: `get(id)` returns the passenger (active or soft-deleted) or
  `PassengerNotFound`.

## Invariants
- **PS-I1**: Every active passenger has a valid `Tier`.
- **PS-I2**: `deletedAt`, when set, is an immutable timestamp.

## Errors
- **PS-E1** `UnauthorizedActor`: non-Crew-Lead attempted a mutation.
- **PS-E2** `PassengerAlreadyExists`: active id collision on create.
- **PS-E3** `PassengerNotFound`: unknown or soft-deleted id on mutate.

## Acceptance scenarios (Given / When / Then)

### Create (PS-R1, PS-R2, PS-E1, PS-E2)
- **PS-S1**: Given a Crew Lead actor, When `create(P1, Silver)` is called,
  Then the service contains `P1` with tier Silver.
- **PS-S2**: Given a non-Crew-Lead actor, When `create(P1, Silver)` is
  called, Then it returns `UnauthorizedActor` and state is unchanged.
- **PS-S3**: Given `P1` already exists and is active, When
  `create(P1, Gold)` is called, Then it returns `PassengerAlreadyExists`.

### Change tier (PS-R3, PS-R4, PS-E1, PS-E3)
- **PS-S4**: Given active passenger `P1` at Silver and a Crew Lead actor,
  When `changeTier(P1, Platinum)` is called, Then `get(P1).tier === 'Platinum'`.
- **PS-S5**: Given a non-Crew-Lead actor, When `changeTier(P1, Gold)` is
  called, Then it returns `UnauthorizedActor` and state is unchanged.
- **PS-S6**: Given unknown id `PX`, When `changeTier(PX, Gold)` is called
  by a Crew Lead, Then it returns `PassengerNotFound`.
- **PS-S7**: Given active passenger `P1` at Gold, When
  `changeTier(P1, Gold)` is called, Then it succeeds and tier stays Gold.

### Soft delete (PS-R5, PS-R6, PS-R7)
- **PS-S8**: Given active passenger `P1`, When `softDelete(P1)` is called
  by a Crew Lead, Then `list()` does not contain `P1` but `get(P1)` still
  returns it with `deletedAt` set.
- **PS-S9**: Given soft-deleted `P1`, When `create(P1, Silver)` is called
  by a Crew Lead, Then it succeeds — a new active `P1` exists.

### Listing (PS-R8)
- **PS-S10**: Given passengers were created in order `P1, P2, P3`,
  When `list()` is called, Then it returns `[P1, P2, P3]` in that order.

## Out of scope
- Hard delete.
- Passenger authentication.
- Arbitrary custom attributes (name is the only freeform field).

## Traceability
| Rule | Test(s) | Implementation |
|------|---------|----------------|
| PS-R1 / PS-E1 | PS-S1, PS-S2, PS-S5 | `application/passenger.service.ts` |
| PS-R2 / PS-E2 | PS-S3 | ditto |
| PS-R3..R4 | PS-S4, PS-S7 | ditto |
| PS-R5..R7 | PS-S6, PS-S8, PS-S9 | ditto |
| PS-R8..R9 | PS-S10 | ditto |
