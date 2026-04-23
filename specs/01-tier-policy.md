# 01 — Tier Policy

**Spec ID prefix:** `TP`

## Purpose
Define the ordering of passenger tiers and the rule that determines whether
a passenger may access a resource.

## Inputs
- `passengerTier: Tier`
- `resourceMinTier: Tier`

## Outputs
- `canAccess: boolean`
- `rank(tier: Tier): 1 | 2 | 3`

## Rules (normative)
- **TP-R1**: `rank(Silver) = 1`, `rank(Gold) = 2`, `rank(Platinum) = 3`.
- **TP-R2**: `canAccess(passengerTier, resourceMinTier) === true`
  iff `rank(passengerTier) >= rank(resourceMinTier)`.
- **TP-R3**: Tier ordering is total and stable. No tier is equal to another.
- **TP-R4**: Tiers are the only membership levels. No custom/intermediate
  tiers exist.

## Invariants
- **TP-I1**: For any `Tier t`, `canAccess(t, t) === true` (reflexive).
- **TP-I2**: For any tiers `a, b`: if `canAccess(a, b)` and `canAccess(b, a)`
  then `a === b` (antisymmetric).
- **TP-I3**: For any tiers `a, b, c`: if `canAccess(a, b)` and `canAccess(b, c)`
  then `canAccess(a, c)` (transitive).

## Errors
- **TP-E1** `InvalidTier`: Raised at the input boundary when a string is
  coerced to `Tier` and does not match any enum member. Domain code assumes
  inputs are already valid `Tier` values.

## Acceptance scenarios (Given / When / Then)

### Access matrix (TP-R2)
- **TP-S1**: Given a Silver passenger and a Silver resource,
  When `canAccess` is evaluated, Then it returns `true`.
- **TP-S2**: Given a Silver passenger and a Gold resource,
  When `canAccess` is evaluated, Then it returns `false`.
- **TP-S3**: Given a Silver passenger and a Platinum resource,
  When `canAccess` is evaluated, Then it returns `false`.
- **TP-S4**: Given a Gold passenger and a Silver resource,
  When `canAccess` is evaluated, Then it returns `true`.
- **TP-S5**: Given a Gold passenger and a Gold resource,
  When `canAccess` is evaluated, Then it returns `true`.
- **TP-S6**: Given a Gold passenger and a Platinum resource,
  When `canAccess` is evaluated, Then it returns `false`.
- **TP-S7**: Given a Platinum passenger and a Silver resource,
  When `canAccess` is evaluated, Then it returns `true`.
- **TP-S8**: Given a Platinum passenger and a Gold resource,
  When `canAccess` is evaluated, Then it returns `true`.
- **TP-S9**: Given a Platinum passenger and a Platinum resource,
  When `canAccess` is evaluated, Then it returns `true`.

### Rank (TP-R1)
- **TP-S10**: `rank('Silver') === 1`.
- **TP-S11**: `rank('Gold') === 2`.
- **TP-S12**: `rank('Platinum') === 3`.

## Out of scope
- Time-boxed / temporary upgrades (not in this challenge).
- Per-resource override of tier rules — a resource's `minTier` is the only
  gate.
- Group/role permissions beyond the three tiers.

## Traceability
| Rule | Test(s) | Implementation |
|------|---------|----------------|
| TP-R1 | TP-S10..S12 | `domain/tier.ts: rank` |
| TP-R2 | TP-S1..S9 | `domain/tier.ts: canAccess` |
| TP-I1..I3 | Property tests (optional) | `domain/tier.ts` |
