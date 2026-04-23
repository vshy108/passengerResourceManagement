/**
 * Closed sum type of every domain error raised by services.
 *
 * Every `kind` appears in exactly one place, making `switch (err.kind)`
 * exhaustive — add a new variant and TypeScript fails all the services
 * that need to handle it (AGENTS.md §5).
 */
export type DomainError =
  /** Attempted to add a 4th Crew Lead (CL-I1: exactly 3 leads). */
  | { kind: "CrewLeadLimitReached" }
  /** Attempted to remove below the minimum of 3 Crew Leads (CL-R3). */
  | { kind: "CrewLeadMinimumBreached" }
  /** Crew Lead id already present (CL-R2). */
  | { kind: "CrewLeadAlreadyExists"; id: string }
  /** Crew Lead id not in the set. */
  | { kind: "CrewLeadNotFound"; id: string }
  /** Bootstrap rejected — wrong count or duplicate ids (CL-R1). */
  | { kind: "CrewLeadBootstrapInvalid"; reason: string }
  /** Caller was not the kind of actor required by the operation. */
  | { kind: "UnauthorizedActor"; required: "CrewLead" | "Passenger" }
  /** Passenger id already present among active passengers (PS-R2). */
  | { kind: "PassengerAlreadyExists"; id: string }
  /** No active passenger with the given id. */
  | { kind: "PassengerNotFound"; id: string }
  /** Resource id already present among active resources (RS-R2). */
  | { kind: "ResourceAlreadyExists"; id: string }
  /** No active resource with the given id. */
  | { kind: "ResourceNotFound"; id: string }
  /** Tier rule rejected the access attempt (AC-R4). Event was still emitted. */
  | { kind: "AccessDenied"; passengerId: string; resourceId: string };
