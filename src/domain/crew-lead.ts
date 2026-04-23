/** Branded Crew Lead id. */
export type CrewLeadId = string & { readonly __brand: "CrewLeadId" };

export const toCrewLeadId = (value: string): CrewLeadId => value as CrewLeadId;

export interface CrewLead {
  readonly id: CrewLeadId;
  readonly name: string;
}
