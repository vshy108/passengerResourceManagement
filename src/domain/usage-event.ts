import type { PassengerId } from "./passenger.js";
import type { ResourceId } from "./resource.js";
import type { Tier } from "./tier.js";

/** Opaque identifier for a usage event. */
export type UsageEventId = string & { readonly __brand: "UsageEventId" };

/** Construct a `UsageEventId` from a raw string. */
export const toUsageEventId = (value: string): UsageEventId =>
  value as UsageEventId;

/** Outcome of a resource-access attempt (see specs/05-access.md). */
export type UsageOutcome = "ALLOWED" | "DENIED";

/**
 * Record of a single access attempt — allowed **or** denied.
 *
 * Every attempt emits one event (AC-R5). Tier values are snapshots at
 * the moment of the attempt so later tier changes do not rewrite
 * history. See specs/05-access.md.
 */
export interface UsageEvent {
  readonly id: UsageEventId;
  readonly passengerId: PassengerId;
  readonly resourceId: ResourceId;
  /** Passenger's tier at the moment of attempt (immutable snapshot). */
  readonly tierAtAttempt: Tier;
  /** Resource's minimum tier at the moment of attempt (immutable snapshot). */
  readonly minTierAtAttempt: Tier;
  /** ISO-8601 timestamp; service-provided via injected `Clock`. */
  readonly timestamp: string;
  readonly outcome: UsageOutcome;
}
