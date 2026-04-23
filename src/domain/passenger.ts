import type { Tier } from "./tier.js";

export type PassengerId = string & { readonly __brand: "PassengerId" };

export const toPassengerId = (value: string): PassengerId =>
  value as PassengerId;

export interface Passenger {
  readonly id: PassengerId;
  readonly name: string;
  readonly tier: Tier;
  readonly deletedAt?: string;
}
