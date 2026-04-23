import type { CrewLeadId } from "./crew-lead.js";
import type { PassengerId } from "./passenger.js";

/**
 * Actor invoking a service operation.
 *
 * Identity is supplied by the caller — authentication is out of scope
 * (see specs/00-glossary.md). Services narrow on `actor.kind` to
 * enforce authorisation rules (e.g. only Crew Leads may mutate state,
 * only Passengers may consume resources).
 */
export type Actor =
  | { kind: "CrewLead"; id: CrewLeadId }
  | { kind: "Passenger"; id: PassengerId };
