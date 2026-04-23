import type { CrewLeadId } from "./crew-lead.js";

/** Opaque identifier for an admin event. */
export type AdminEventId = string & { readonly __brand: "AdminEventId" };

/** Construct an `AdminEventId` from a raw string. */
export const toAdminEventId = (value: string): AdminEventId =>
  value as AdminEventId;

/**
 * Closed set of admin actions emitted by services on successful
 * mutations. Add a new variant to extend — the exhaustiveness check on
 * `AdminAction` will then flag every switch that must be updated.
 */
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

/** Kind of entity the admin action targeted. */
export type AdminTargetKind = "CrewLead" | "Passenger" | "Resource";

/**
 * Record of a single successful admin mutation.
 *
 * Emitted by `CrewLeadService`, `PassengerService`, `ResourceService`
 * via the shared `AuditEmitter`. See specs/06-audit.md (AU-R1..R6).
 */
export interface AdminEvent {
  readonly id: AdminEventId;
  /** Crew Lead who performed the action. */
  readonly actorId: CrewLeadId;
  readonly action: AdminAction;
  readonly targetKind: AdminTargetKind;
  /** Raw id of the target entity (not branded — target kind is in `targetKind`). */
  readonly targetId: string;
  /** ISO-8601 timestamp; service-provided via injected `Clock`. */
  readonly timestamp: string;
  /** Optional action-specific metadata (e.g. `{ newTier: "Gold" }`). */
  readonly details?: Readonly<Record<string, string>>;
}
