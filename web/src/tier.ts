import type { Tier } from "./types.js";

/** Tier rank — mirrors `src/domain/tier.ts`. See WI-R3. */
export const RANK: Record<Tier, number> = {
  Silver: 1,
  Gold: 2,
  Platinum: 3,
};

export const TIERS: readonly Tier[] = ["Silver", "Gold", "Platinum"];

export const canAccess = (passenger: Tier, resourceMin: Tier): boolean =>
  RANK[passenger] >= RANK[resourceMin];
