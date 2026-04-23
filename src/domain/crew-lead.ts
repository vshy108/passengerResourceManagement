/**
 * Opaque identifier for a Crew Lead.
 *
 * Branded to prevent accidental mixing with other string ids
 * (`PassengerId`, `ResourceId`) — the branding field only exists in the
 * type system, so there is zero runtime cost.
 */
export type CrewLeadId = string & { readonly __brand: "CrewLeadId" };

/**
 * Construct a `CrewLeadId` from a raw string.
 *
 * Call at the system boundary (CLI / HTTP adapter) after validation.
 * Inside `domain/` and `application/`, always pass `CrewLeadId`, never
 * raw strings.
 */
export const toCrewLeadId = (value: string): CrewLeadId => value as CrewLeadId;

/** Crew Lead aggregate. Leads are immutable once created. */
export interface CrewLead {
  readonly id: CrewLeadId;
  readonly name: string;
}
