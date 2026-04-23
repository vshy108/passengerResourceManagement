/**
 * Closed sum type of all domain errors.
 * See AGENTS.md §5.
 */
export type DomainError =
  | { kind: "CrewLeadLimitReached" }
  | { kind: "CrewLeadMinimumBreached" }
  | { kind: "CrewLeadAlreadyExists"; id: string }
  | { kind: "CrewLeadNotFound"; id: string }
  | { kind: "CrewLeadBootstrapInvalid"; reason: string };
