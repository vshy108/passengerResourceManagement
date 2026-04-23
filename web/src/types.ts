/**
 * Local copies of the server's wire shapes. Kept as a local copy so
 * the web package stays decoupled from the server TypeScript project
 * (see specs/11-web-interactive.md, WI-R4).
 */
export type Tier = "Silver" | "Gold" | "Platinum";

export interface CrewLead {
  readonly id: string;
  readonly name: string;
}

export interface Passenger {
  readonly id: string;
  readonly name: string;
  readonly tier: Tier;
  readonly deletedAt?: string;
}

export interface Resource {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly minTier: Tier;
}

export type ActorKind = "CrewLead" | "Passenger";

export interface Actor {
  readonly kind: ActorKind;
  readonly id: string;
  readonly name: string;
}

export interface UsageEvent {
  readonly id: string;
  readonly passengerId: string;
  readonly resourceId: string;
  readonly tierAtAttempt: Tier;
  readonly minTierAtAttempt: Tier;
  readonly timestamp: string;
  readonly outcome: "ALLOWED" | "DENIED";
}

export type AggregateByTier = Readonly<
  Record<Tier, { readonly allowed: number; readonly denied: number }>
>;

export type TopResources = readonly string[];
