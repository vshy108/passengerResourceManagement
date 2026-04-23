import type { CrewLead, CrewLeadId } from "../domain/crew-lead.js";
import type { DomainError } from "../domain/errors.js";
import { err, ok, type Result } from "../domain/result.js";
import type { AuditEmitter } from "./audit-emitter.js";

/** Invariant CL-I1: the system always has exactly three Crew Leads. */
const REQUIRED_COUNT = 3;

/**
 * Crew Lead service.
 *
 * Enforces the "exactly three Crew Leads" invariant (CL-I1) and emits
 * admin events for bootstrap / add / replace. See specs/02-crew-lead.md.
 *
 * @example
 * ```ts
 * const leads = new CrewLeadService(audit);
 * leads.bootstrap([alice, bob, carol]); // CL-R1
 * leads.replace(bob.id, dave, alice.id); // CL-R4
 * ```
 */
export class CrewLeadService {
  private leads: CrewLead[] = [];
  private bootstrapped = false;

  /** @param audit Optional emitter; omit to disable audit events. */
  constructor(private readonly audit?: AuditEmitter) {}

  /**
   * CL-R1: seed the system with exactly three unique Crew Leads.
   *
   * The first lead in the list is recorded as the actor on the
   * `CrewLeadBootstrapped` event (there is no other Crew Lead to
   * attribute the action to).
   */
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
    this.audit?.record(
      leads[0]!.id,
      "CrewLeadBootstrapped",
      "CrewLead",
      leads[0]!.id,
      { count: String(leads.length) },
    );
    return ok(this.list());
  }

  /**
   * CL-R2: add a Crew Lead (only meaningful before bootstrap, since
   * the cap is 3). Rejects if the cap is reached or the id exists.
   *
   * @param actor The acting Crew Lead for audit attribution. When
   *              omitted, no event is emitted (supports silent setup
   *              in tests).
   */
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
   * CL-R3: removal is not supported.
   *
   * Always returns `CrewLeadMinimumBreached` — the exactly-3 invariant
   * (CL-I1) plus the count cap in `add` mean the success path is
   * unreachable. Use `replace` to rotate a lead. Kept for API symmetry.
   */
  remove(_id: CrewLeadId): Result<void, DomainError> {
    return err({ kind: "CrewLeadMinimumBreached" });
  }

  /**
   * CL-R4: swap an existing Crew Lead for a new one, preserving the
   * three-leads invariant.
   *
   * `newLead.id` may equal `oldId` (rename in place); if it differs,
   * the new id must not already belong to another lead.
   */
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

  /** Snapshot of the current Crew Lead set (insertion-ordered). */
  list(): readonly CrewLead[] {
    return [...this.leads];
  }

  /** True once `bootstrap` has succeeded. */
  isBootstrapped(): boolean {
    return this.bootstrapped;
  }
}
