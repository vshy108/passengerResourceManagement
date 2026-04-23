import type { PassengerId } from "../domain/passenger.js";
import type { ResourceId } from "../domain/resource.js";
import { TIERS, type Tier } from "../domain/tier.js";
import type { UsageEvent } from "../domain/usage-event.js";
import type { UsageEventSource } from "./usage-event-source.js";

/**
 * Aggregated allowed/denied counts per tier.
 *
 * Produced by {@link ReportingService.aggregateByTier}. Every tier in
 * {@link TIERS} is guaranteed to appear in the record (zeros when
 * absent — RP-R2).
 */
export type TierAggregate = Readonly<
  Record<Tier, { readonly allowed: number; readonly denied: number }>
>;

/**
 * Reporting service — read-only queries over the usage-event trail.
 *
 * Depends only on the read port (`UsageEventSource`) so tests can feed
 * it a bare stub. Never mutates state and never emits events of its
 * own. See specs/07-reporting.md.
 */
export class ReportingService {
  constructor(private readonly source: UsageEventSource) {}

  /**
   * RP-R1: all usage events for the given passenger, in insertion
   * order (chronological since the sink is append-only). Returns `[]`
   * when the passenger has no recorded events — never an error.
   */
  personalHistory(passengerId: PassengerId): readonly UsageEvent[] {
    return this.source.list().filter((e) => e.passengerId === passengerId);
  }

  /**
   * RP-R2: allowed/denied counts bucketed by *tier at the moment of
   * attempt* (`tierAtAttempt`), not the passenger's current tier.
   * Every tier in {@link TIERS} appears in the result.
   */
  aggregateByTier(): TierAggregate {
    const totals: Record<Tier, { allowed: number; denied: number }> =
      Object.fromEntries(
        TIERS.map((t) => [t, { allowed: 0, denied: 0 }]),
      ) as Record<Tier, { allowed: number; denied: number }>;

    for (const e of this.source.list()) {
      const bucket = totals[e.tierAtAttempt];
      if (e.outcome === "ALLOWED") {
        bucket.allowed += 1;
      } else {
        bucket.denied += 1;
      }
    }
    return totals;
  }

  /**
   * RP-R3..R4: top-`n` resources by **allowed** usage count, descending.
   *
   * Denied attempts are ignored (RP-R4). Ties are broken by `resourceId`
   * ascending so the order is fully deterministic. `n <= 0` returns `[]`.
   */
  topResources(n: number): readonly ResourceId[] {
    if (n <= 0) return [];
    const counts = new Map<ResourceId, number>();
    for (const e of this.source.list()) {
      if (e.outcome !== "ALLOWED") continue;
      counts.set(e.resourceId, (counts.get(e.resourceId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort(([idA, a], [idB, b]) => {
        if (b !== a) return b - a; // count desc
        return idA.localeCompare(idB); // id asc (deterministic tie-break)
      })
      .slice(0, n)
      .map(([id]) => id);
  }
}
