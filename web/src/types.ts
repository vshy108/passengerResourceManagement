/**
 * Mirrors the shapes produced by `src/interface/snapshot.ts`. Kept as
 * a local copy so the web package stays decoupled from the server
 * TypeScript project (see specs/10-web.md, WB-R4).
 */
export type Tier = "Silver" | "Gold" | "Platinum";

export interface Passenger {
  readonly id: string;
  readonly name: string;
  readonly tier: Tier;
}

export interface Resource {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly minTier: Tier;
}

export interface Snapshot {
  readonly passengers: Passenger[];
  readonly resources: Resource[];
}
