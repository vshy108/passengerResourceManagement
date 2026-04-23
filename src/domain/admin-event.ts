import type { CrewLeadId } from "./crew-lead.js";

export type AdminEventId = string & { readonly __brand: "AdminEventId" };

export const toAdminEventId = (value: string): AdminEventId =>
  value as AdminEventId;

export type AdminAction =
  | "CrewLeadBootstrapped"
  | "CrewLeadAdded"
  | "CrewLeadRemoved"
  | "CrewLeadReplaced"
  | "PassengerCreated"
  | "PassengerTierChanged"
  | "PassengerDeleted"
  | "ResourceCreated"
  | "ResourceMinTierChanged"
  | "ResourceDeleted";

export type AdminTargetKind = "CrewLead" | "Passenger" | "Resource";

export interface AdminEvent {
  readonly id: AdminEventId;
  readonly actorId: CrewLeadId;
  readonly action: AdminAction;
  readonly targetKind: AdminTargetKind;
  readonly targetId: string;
  readonly timestamp: string;
  readonly details?: Readonly<Record<string, string>>;
}
