/**
 * Membership tier — the access-control currency of the system.
 *
 * Rank order: Silver < Gold < Platinum. A passenger may use a resource
 * iff their tier rank is ≥ the resource's minimum tier rank (TP-R2).
 * See specs/01-tier-policy.md.
 */
export type Tier = "Silver" | "Gold" | "Platinum";

/** Canonical ascending order of tiers. Useful for iteration in reports. */
export const TIERS: readonly Tier[] = ["Silver", "Gold", "Platinum"] as const;

const RANKS: Readonly<Record<Tier, 1 | 2 | 3>> = {
  Silver: 1,
  Gold: 2,
  Platinum: 3,
};

/**
 * TP-R1: numeric rank of a tier (Silver = 1, Gold = 2, Platinum = 3).
 * Use ranks for ordering; never string equality.
 */
export function rank(tier: Tier): 1 | 2 | 3 {
  return RANKS[tier];
}

/**
 * TP-R2: tier policy — a passenger at `passengerTier` may access a
 * resource whose minimum tier is `resourceMinTier` iff their rank is
 * greater or equal.
 */
export function canAccess(passengerTier: Tier, resourceMinTier: Tier): boolean {
  return rank(passengerTier) >= rank(resourceMinTier);
}
