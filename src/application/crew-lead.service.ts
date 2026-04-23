import type { CrewLead, CrewLeadId } from "../domain/crew-lead.js";
import type { DomainError } from "../domain/errors.js";
import type { Result } from "../domain/result.js";

/**
 * Crew Lead service — enforces the "exactly 3" invariant.
 * See specs/02-crew-lead.md
 */
export class CrewLeadService {
  bootstrap(
    _leads: readonly CrewLead[],
  ): Result<readonly CrewLead[], DomainError> {
    throw new Error("not implemented");
  }

  add(_lead: CrewLead): Result<CrewLead, DomainError> {
    throw new Error("not implemented");
  }

  remove(_id: CrewLeadId): Result<void, DomainError> {
    throw new Error("not implemented");
  }

  replace(
    _oldId: CrewLeadId,
    _newLead: CrewLead,
  ): Result<CrewLead, DomainError> {
    throw new Error("not implemented");
  }

  list(): readonly CrewLead[] {
    throw new Error("not implemented");
  }
}
