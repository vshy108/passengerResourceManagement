import type { Actor } from "../domain/actor.js";
import type { CrewLeadId } from "../domain/crew-lead.js";
import type { DomainError } from "../domain/errors.js";
import { err, ok, type Result } from "../domain/result.js";

/**
 * Guard: narrow an `Actor` to a crew-lead identity.
 *
 * Centralises the authorisation check used by every admin mutation
 * (passenger / resource create, update, soft-delete). Returns the
 * `CrewLeadId` on success so the caller can thread it straight into
 * audit emission.
 */
export function requireCrewLead(actor: Actor): Result<CrewLeadId, DomainError> {
  if (actor.kind !== "CrewLead") {
    return err({ kind: "UnauthorizedActor", required: "CrewLead" });
  }
  return ok(actor.id);
}
