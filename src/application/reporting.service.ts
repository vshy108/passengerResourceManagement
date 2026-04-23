import type { PassengerId } from "../domain/passenger.js";
import type { ResourceId } from "../domain/resource.js";
import { TIERS, type Tier } from "../domain/tier.js";
import type { UsageEvent } from "../domain/usage-event.js";

/**
 * Read-only source of usage events.
 * `UsageEventSink` satisfies this interface.
 */
export interface UsageEventSource {
  list(): readonly UsageEvent[];
}

export type TierAggregate = Readonly<
  Record<Tier, { readonly allowed: number; readonly denied: number }>
>;

/**
 * Reporting service — read-only queries over the usage trail.
 * See specs/07-reporting.md
 */
export class ReportingService {
  constructor(private readonly source: UsageEventSource) {}

  personalHistory(passengerId: PassengerId): readonly UsageEvent[] {
    return this.source.list().filter((e) => e.passengerId === passengerId);
  }

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
