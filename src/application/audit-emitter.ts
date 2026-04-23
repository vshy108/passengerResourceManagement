import {
  toAdminEventId,
  type AdminAction,
  type AdminTargetKind,
} from "../domain/admin-event.js";
import type { CrewLeadId } from "../domain/crew-lead.js";
import type { Clock } from "../infrastructure/clock.js";
import type { AdminEventSink } from "./admin-event-sink.js";

/**
 * Dependencies required to emit `AdminEvent`s.
 *
 * Grouped into a single object so each service ctor takes one optional
 * `AuditEmitter` instead of three separate parameters.
 * See specs/06-audit.md (AU-R6).
 */
export interface AuditDeps {
  readonly clock: Clock;
  readonly sink: AdminEventSink;
  /** Injected id generator (UUID in production, counter in tests). */
  readonly idGen: () => string;
}

/**
 * Formats and records `AdminEvent`s against an `AdminEventSink`.
 *
 * Extracted so that each admin service (`CrewLeadService`,
 * `PassengerService`, `ResourceService`) stays focused on its own
 * invariants and delegates event formatting / id generation /
 * timestamping to a single place.
 *
 * Passed as an *optional* constructor argument — services work without
 * it (silent mode), which simplifies unit tests that do not care about
 * the audit trail. See specs/06-audit.md.
 */
export class AuditEmitter {
  constructor(private readonly deps: AuditDeps) {}

  /**
   * Format and record a single admin event.
   *
   * @param actorId    Crew Lead who performed the action.
   * @param action     Closed-union action kind.
   * @param targetKind Entity kind the action targeted.
   * @param targetId   Raw id of the target entity.
   * @param details    Optional action-specific metadata (e.g. `{ newTier }`).
   */
  record(
    actorId: CrewLeadId,
    action: AdminAction,
    targetKind: AdminTargetKind,
    targetId: string,
    details?: Readonly<Record<string, string>>,
  ): void {
    this.deps.sink.record({
      id: toAdminEventId(this.deps.idGen()),
      actorId,
      action,
      targetKind,
      targetId,
      timestamp: this.deps.clock.now().toISOString(),
      ...(details !== undefined ? { details } : {}),
    });
  }
}
