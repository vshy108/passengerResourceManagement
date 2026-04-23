import type { CrewLead, CrewLeadId } from "../domain/crew-lead.js";
import type { DomainError } from "../domain/errors.js";
import { err, ok, type Result } from "../domain/result.js";
import type { AuditEmitter } from "./audit-emitter.js";

const REQUIRED_COUNT = 3;

/**
 * Crew Lead service — enforces the "exactly 3" invariant.
 * See specs/02-crew-lead.md
 */
export class CrewLeadService {
  private leads: CrewLead[] = [];
  private bootstrapped = false;

  constructor(private readonly audit?: AuditEmitter) {}

  bootstrap(
    leads: readonly CrewLead[],
  ): Result<readonly CrewLead[], DomainError> {
    if (leads.length !== REQUIRED_COUNT) {
      return err({
        kind: "CrewLeadBootstrapInvalid",
        reason: `expected ${String(REQUIRED_COUNT)} leads, got ${String(leads.length)}`,
      });
    }
    const ids = new Set(leads.map((l) => l.id));
    if (ids.size !== leads.length) {
      return err({
        kind: "CrewLeadBootstrapInvalid",
        reason: "duplicate ids",
      });
    }
    this.leads = [...leads];
    this.bootstrapped = true;
    // Use the first lead as the actor of record for the bootstrap event.
    this.audit?.record(
      leads[0]!.id,
      "CrewLeadBootstrapped",
      "CrewLead",
      leads[0]!.id,
      { count: String(leads.length) },
    );
    return ok(this.list());
  }

  add(lead: CrewLead, actor?: CrewLeadId): Result<CrewLead, DomainError> {
    if (this.leads.length >= REQUIRED_COUNT) {
      return err({ kind: "CrewLeadLimitReached" });
    }
    if (this.leads.some((l) => l.id === lead.id)) {
      return err({ kind: "CrewLeadAlreadyExists", id: lead.id });
    }
    this.leads.push(lead);
    if (actor !== undefined) {
      this.audit?.record(actor, "CrewLeadAdded", "CrewLead", lead.id);
    }
    return ok(lead);
  }

  /**
   * Always returns `CrewLeadMinimumBreached` — the exactly-3 invariant
   * (CL-I1) plus the count cap in `add` mean the success path is
   * unreachable. Use `replace` to rotate a lead. Kept for API symmetry.
   */
  remove(_id: CrewLeadId): Result<void, DomainError> {
    return err({ kind: "CrewLeadMinimumBreached" });
  }

  replace(
    oldId: CrewLeadId,
    newLead: CrewLead,
    actor?: CrewLeadId,
  ): Result<CrewLead, DomainError> {
    const idx = this.leads.findIndex((l) => l.id === oldId);
    if (idx === -1) {
      return err({ kind: "CrewLeadNotFound", id: oldId });
    }
    if (newLead.id !== oldId && this.leads.some((l) => l.id === newLead.id)) {
      return err({ kind: "CrewLeadAlreadyExists", id: newLead.id });
    }
    this.leads[idx] = newLead;
    if (actor !== undefined) {
      this.audit?.record(actor, "CrewLeadReplaced", "CrewLead", newLead.id, {
        replacedId: oldId,
      });
    }
    return ok(newLead);
  }

  list(): readonly CrewLead[] {
    return [...this.leads];
  }

  isBootstrapped(): boolean {
    return this.bootstrapped;
  }
}
