# 04 — Resource

**Spec ID prefix:** `RS`

## Purpose
Define the Resource catalog: provisioning, updating, and decommissioning
onboard facilities (sleeping pods, food stations, etc.). Only Crew Leads may
mutate resources.

## Inputs
- `Resource { id: ResourceId, name: string, category: string, minTier: Tier, deletedAt?: ISOString }`
- An authenticated Crew Lead actor for every mutation.

## Outputs
- `Result<Resource, DomainError>` from mutations.
- `readonly Resource[]` from queries (active resources by default).

## Rules (normative)
- **RS-R1**: `create(actor, resource)` provisions a new resource. Only a
  Crew Lead may call this.
  - Error: `UnauthorizedActor`.
- **RS-R2**: Resource ids are unique among **active** resources.
  - Error: `ResourceAlreadyExists`.
- **RS-R3**: `changeMinTier(actor, id, newTier)` updates the minimum tier.
  Only a Crew Lead may call this. Future access checks use the new value;
  historical `UsageEvent`s are unaffected.
- **RS-R4**: `softDelete(actor, id)` marks a resource as decommissioned.
  Soft-deleted resources do not appear in `list()` or `listAccessibleFor()`
  but remain resolvable by `get(id)` for audit.
- **RS-R5**: Operating on an unknown or soft-deleted id is rejected.
  - Error: `ResourceNotFound`.
- **RS-R6**: `list()` returns active resources in insertion order.
- **RS-R7**: `listAccessibleFor(tier)` returns active resources where
  `canAccess(tier, resource.minTier) === true`, in insertion order.

## Invariants
- **RS-I1**: Every active resource has a valid `Tier` as `minTier`.
- **RS-I2**: `deletedAt`, when set, is immutable.

## Errors
- **RS-E1** `UnauthorizedActor`: non-Crew-Lead attempted a mutation.
- **RS-E2** `ResourceAlreadyExists`: active id collision on create.
- **RS-E3** `ResourceNotFound`: unknown or soft-deleted id on mutate.

## Acceptance scenarios (Given / When / Then)

### Create (RS-R1, RS-R2)
- **RS-S1**: Given a Crew Lead actor, When `create(R1, minTier=Silver)` is
  called, Then the catalog contains `R1`.
- **RS-S2**: Given a non-Crew-Lead actor, When `create` is called, Then it
  returns `UnauthorizedActor` and state is unchanged.
- **RS-S3**: Given `R1` already exists and is active, When `create(R1)` is
  called, Then it returns `ResourceAlreadyExists`.

### Change min tier (RS-R3)
- **RS-S4**: Given active resource `R1` at Silver, When
  `changeMinTier(R1, Platinum)` is called by a Crew Lead, Then
  `get(R1).minTier === 'Platinum'`.
- **RS-S5**: Given a non-Crew-Lead actor, When `changeMinTier` is called,
  Then it returns `UnauthorizedActor`.
- **RS-S6**: Given unknown id `RX`, When `changeMinTier(RX, Gold)` is
  called by a Crew Lead, Then it returns `ResourceNotFound`.

### Soft delete (RS-R4, RS-R5)
- **RS-S7**: Given active `R1`, When `softDelete(R1)` is called by a Crew
  Lead, Then `list()` does not contain `R1` but `get(R1)` returns it with
  `deletedAt` set.
- **RS-S8**: Given soft-deleted `R1`, When `changeMinTier(R1, Gold)` is
  called, Then it returns `ResourceNotFound`.

### Listing (RS-R6, RS-R7)
- **RS-S9**: Given resources `R1, R2, R3` were created in order,
  When `list()` is called, Then it returns `[R1, R2, R3]`.
- **RS-S10**: Given Silver resource `S1`, Gold resource `G1`, and Platinum
  resource `P1` are active, When `listAccessibleFor('Gold')` is called,
  Then it returns `[S1, G1]` (not `P1`).
- **RS-S11**: Given a soft-deleted Silver resource, When
  `listAccessibleFor('Platinum')` is called, Then the deleted resource is
  excluded.

## Out of scope
- Resource capacity / concurrent use limits.
- Hard delete.
- Resource reservations or time slots.

## Traceability
| Rule | Test(s) | Implementation |
|------|---------|----------------|
| RS-R1 / RS-E1 | RS-S1, RS-S2, RS-S5 | `application/resource.service.ts` |
| RS-R2 / RS-E2 | RS-S3 | ditto |
| RS-R3 | RS-S4, RS-S6 | ditto |
| RS-R4 / RS-R5 | RS-S7, RS-S8 | ditto |
| RS-R6 | RS-S9 | ditto |
| RS-R7 | RS-S10, RS-S11 | uses `domain/tier.ts: canAccess` |
