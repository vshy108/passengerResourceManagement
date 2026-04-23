import type { CrewLeadId } from "./crew-lead.js";
import type { PassengerId } from "./passenger.js";

/**
 * Actor invoking a service method. Identity is supplied by the caller —
 * authentication is out of scope (see specs/00-glossary.md).
 */
export type Actor =
  | { kind: "CrewLead"; id: CrewLeadId }
  | { kind: "Passenger"; id: PassengerId };
