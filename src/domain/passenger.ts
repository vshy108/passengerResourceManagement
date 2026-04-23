import type { Tier } from "./tier.js";

/** Opaque identifier for a Passenger (branded to prevent id mix-ups). */
export type PassengerId = string & { readonly __brand: "PassengerId" };

/** Construct a `PassengerId` from a raw string. Call at the boundary. */
export const toPassengerId = (value: string): PassengerId =>
  value as PassengerId;

/**
 * Passenger aggregate.
 *
 * `deletedAt` is set when a passenger is soft-deleted (PS-R5). Soft-
 * deleted passengers remain in the store so historical usage events
 * continue to resolve back to the actor, but they are excluded from
 * `list()` and cannot access resources.
 */
export interface Passenger {
  readonly id: PassengerId;
  readonly name: string;
  readonly tier: Tier;
  /** ISO-8601 timestamp set on soft-delete. Absent on active passengers. */
  readonly deletedAt?: string;
}
