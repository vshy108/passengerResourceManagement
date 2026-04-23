import {
  toAdminEventId,
  type AdminAction,
  type AdminTargetKind,
} from "../domain/admin-event.js";
import type { CrewLeadId } from "../domain/crew-lead.js";
import type { AuditContext } from "./audit-context.js";

/**
 * Formats and records `AdminEvent`s against an `AdminEventSink`.
 *
 * Extracted so that each admin service (CrewLead, Passenger, Resource)
 * stays focused on its own invariants and delegates event formatting
 * to a single place. See specs/06-audit.md.
 */
export class AuditEmitter {
  constructor(private readonly ctx: AuditContext) {}

  record(
    actorId: CrewLeadId,
    action: AdminAction,
    targetKind: AdminTargetKind,
    targetId: string,
    details?: Readonly<Record<string, string>>,
  ): void {
    this.ctx.sink.record({
      id: toAdminEventId(this.ctx.idGen()),
      actorId,
      action,
      targetKind,
      targetId,
      timestamp: this.ctx.clock.now().toISOString(),
      ...(details !== undefined ? { details } : {}),
    });
  }
}
