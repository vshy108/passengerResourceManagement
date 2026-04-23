/**
 * Membership tier enum.
 * See specs/01-tier-policy.md
 */
export type Tier = "Silver" | "Gold" | "Platinum";

export const TIERS: readonly Tier[] = ["Silver", "Gold", "Platinum"] as const;

/**
 * TP-R1: rank(Silver)=1, rank(Gold)=2, rank(Platinum)=3.
 */
export function rank(_tier: Tier): 1 | 2 | 3 {
  throw new Error("not implemented");
}

/**
 * TP-R2: canAccess iff rank(passengerTier) >= rank(resourceMinTier).
 */
export function canAccess(
  _passengerTier: Tier,
  _resourceMinTier: Tier,
): boolean {
  throw new Error("not implemented");
}
