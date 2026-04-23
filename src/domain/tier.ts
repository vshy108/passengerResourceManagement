/**
 * Membership tier enum.
 * See specs/01-tier-policy.md
 */
export type Tier = "Silver" | "Gold" | "Platinum";

export const TIERS: readonly Tier[] = ["Silver", "Gold", "Platinum"] as const;

const RANKS: Readonly<Record<Tier, 1 | 2 | 3>> = {
  Silver: 1,
  Gold: 2,
  Platinum: 3,
};

/**
 * TP-R1: rank(Silver)=1, rank(Gold)=2, rank(Platinum)=3.
 */
export function rank(tier: Tier): 1 | 2 | 3 {
  return RANKS[tier];
}

/**
 * TP-R2: canAccess iff rank(passengerTier) >= rank(resourceMinTier).
 */
export function canAccess(
  passengerTier: Tier,
  resourceMinTier: Tier,
): boolean {
  return rank(passengerTier) >= rank(resourceMinTier);
}
