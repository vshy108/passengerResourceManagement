import type { CrewLead, CrewLeadId } from "../domain/crew-lead.js";
import type { DomainError } from "../domain/errors.js";
import { err, ok, type Result } from "../domain/result.js";
import type { Clock } from "../infrastructure/clock.js";
import type { AdminEventSink } from "./admin-event-sink.js";

const REQUIRED_COUNT = 3;

/**
 * Crew Lead service — enforces the "exactly 3" invariant.
 * See specs/02-crew-lead.md
 */
export class CrewLeadService {
  private leads: CrewLead[] = [];
  private bootstrapped = false;

  constructor(
    private readonly clock?: Clock,
    private readonly sink?: AdminEventSink,
    private readonly idGen?: () => string,
  ) {}

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
    return ok(this.list());
  }

  add(lead: CrewLead, _actor?: CrewLeadId): Result<CrewLead, DomainError> {
    if (this.leads.length >= REQUIRED_COUNT) {
      return err({ kind: "CrewLeadLimitReached" });
    }
    if (this.leads.some((l) => l.id === lead.id)) {
      return err({ kind: "CrewLeadAlreadyExists", id: lead.id });
    }
    this.leads.push(lead);
    return ok(lead);
  }

  remove(id: CrewLeadId, _actor?: CrewLeadId): Result<void, DomainError> {
    if (this.leads.length <= REQUIRED_COUNT) {
      return err({ kind: "CrewLeadMinimumBreached" });
    }
    const idx = this.leads.findIndex((l) => l.id === id);
    if (idx === -1) {
      return err({ kind: "CrewLeadNotFound", id });
    }
    this.leads.splice(idx, 1);
    return ok(undefined);
  }

  replace(
    oldId: CrewLeadId,
    newLead: CrewLead,
    _actor?: CrewLeadId,
  ): Result<CrewLead, DomainError> {
    const idx = this.leads.findIndex((l) => l.id === oldId);
    if (idx === -1) {
      return err({ kind: "CrewLeadNotFound", id: oldId });
    }
    if (newLead.id !== oldId && this.leads.some((l) => l.id === newLead.id)) {
      return err({ kind: "CrewLeadAlreadyExists", id: newLead.id });
    }
    this.leads[idx] = newLead;
    return ok(newLead);
  }

  list(): readonly CrewLead[] {
    return [...this.leads];
  }

  isBootstrapped(): boolean {
    return this.bootstrapped;
  }
}
