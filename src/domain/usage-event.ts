import type { PassengerId } from "./passenger.js";
import type { ResourceId } from "./resource.js";
import type { Tier } from "./tier.js";

export type UsageEventId = string & { readonly __brand: "UsageEventId" };

export const toUsageEventId = (value: string): UsageEventId =>
  value as UsageEventId;

export type UsageOutcome = "ALLOWED" | "DENIED";

export interface UsageEvent {
  readonly id: UsageEventId;
  readonly passengerId: PassengerId;
  readonly resourceId: ResourceId;
  readonly tierAtAttempt: Tier;
  readonly minTierAtAttempt: Tier;
  readonly timestamp: string;
  readonly outcome: UsageOutcome;
}
