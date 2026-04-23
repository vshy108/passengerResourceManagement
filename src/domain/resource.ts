import type { Tier } from "./tier.js";

export type ResourceId = string & { readonly __brand: "ResourceId" };

export const toResourceId = (value: string): ResourceId => value as ResourceId;

export interface Resource {
  readonly id: ResourceId;
  readonly name: string;
  readonly category: string;
  readonly minTier: Tier;
  readonly deletedAt?: string;
}
