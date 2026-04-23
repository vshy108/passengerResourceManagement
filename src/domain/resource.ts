import type { Tier } from "./tier.js";

/** Opaque identifier for a Resource (branded to prevent id mix-ups). */
export type ResourceId = string & { readonly __brand: "ResourceId" };

/** Construct a `ResourceId` from a raw string. Call at the boundary. */
export const toResourceId = (value: string): ResourceId => value as ResourceId;

/**
 * Resource aggregate — something a passenger may attempt to use.
 *
 * `minTier` is the lowest tier allowed to access the resource; see
 * `canAccess` in `./tier.ts`. `deletedAt` soft-deletes the resource
 * while preserving historical usage events (RS-R5).
 */
export interface Resource {
  readonly id: ResourceId;
  readonly name: string;
  readonly category: string;
  readonly minTier: Tier;
  /** ISO-8601 timestamp set on soft-delete. Absent on active resources. */
  readonly deletedAt?: string;
}
