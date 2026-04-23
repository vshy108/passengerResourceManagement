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

  personalHistory(_passengerId: PassengerId): readonly UsageEvent[] {
    return [];
  }

  aggregateByTier(): TierAggregate {
    const empty = Object.fromEntries(
      TIERS.map((t) => [t, { allowed: 0, denied: 0 }]),
    ) as Record<Tier, { allowed: number; denied: number }>;
    return empty;
  }

  topResources(_n: number): readonly ResourceId[] {
    return [];
  }
}
