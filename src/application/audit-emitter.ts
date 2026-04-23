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
 * See specs/06-audit.md (AU-R6).
 */
export interface AuditDeps {
  readonly clock: Clock;
  readonly sink: AdminEventSink;
  readonly idGen: () => string;
}

/**
 * Formats and records `AdminEvent`s against an `AdminEventSink`.
 *
 * Extracted so that each admin service (CrewLead, Passenger, Resource)
 * stays focused on its own invariants and delegates event formatting
 * to a single place. See specs/06-audit.md.
 */
export class AuditEmitter {
  constructor(private readonly deps: AuditDeps) {}

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
