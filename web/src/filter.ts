import type { Resource, Tier } from "./types";

/** TP-R1 ranking, duplicated here so the web bundle stays standalone. */
const RANK: Record<Tier, number> = { Silver: 1, Gold: 2, Platinum: 3 };

/**
 * WB-R3: keep only resources whose minimum tier the given tier
 * satisfies (TP-R2). Pure function so it can be unit-tested without a
 * React runtime.
 */
export function filterByTier(
  resources: readonly Resource[],
  tier: Tier,
): Resource[] {
  return resources.filter((r) => RANK[tier] >= RANK[r.minTier]);
}
