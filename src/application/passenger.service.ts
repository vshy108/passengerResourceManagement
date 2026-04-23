import type { Actor } from "../domain/actor.js";
import type { DomainError } from "../domain/errors.js";
import type { Passenger, PassengerId } from "../domain/passenger.js";
import { err, ok, type Result } from "../domain/result.js";
import type { Tier } from "../domain/tier.js";
import type { Clock } from "../infrastructure/clock.js";
import type { AuditEmitter } from "./audit-emitter.js";
import { requireCrewLead } from "./guards.js";

/**
 * Passenger service.
 * See specs/03-passenger.md
 */
export class PassengerService {
  /** All passengers ever created, including soft-deleted ones (for audit). */
  private readonly all: Passenger[] = [];

  constructor(
    private readonly clock: Clock,
    private readonly audit?: AuditEmitter,
  ) {}

  create(
    actor: Actor,
    input: { id: PassengerId; name: string; tier: Tier },
  ): Result<Passenger, DomainError> {
    const auth = requireCrewLead(actor);
    if (!auth.ok) return auth;
    if (this.findActiveIndex(input.id) !== -1) {
      return err({ kind: "PassengerAlreadyExists", id: input.id });
    }
    const passenger: Passenger = {
      id: input.id,
      name: input.name,
      tier: input.tier,
    };
    this.all.push(passenger);
    this.audit?.record(auth.value, "PassengerCreated", "Passenger", input.id);
    return ok(passenger);
  }

  changeTier(
    actor: Actor,
    id: PassengerId,
    newTier: Tier,
  ): Result<Passenger, DomainError> {
    const auth = requireCrewLead(actor);
    if (!auth.ok) return auth;
    const idx = this.findActiveIndex(id);
    if (idx === -1) {
      return err({ kind: "PassengerNotFound", id });
    }
    const existing = this.all[idx]!;
    const updated: Passenger = { ...existing, tier: newTier };
    this.all[idx] = updated;
    this.audit?.record(auth.value, "PassengerTierChanged", "Passenger", id, {
      newTier,
    });
    return ok(updated);
  }

  softDelete(actor: Actor, id: PassengerId): Result<Passenger, DomainError> {
    const auth = requireCrewLead(actor);
    if (!auth.ok) return auth;
    const idx = this.findActiveIndex(id);
    if (idx === -1) {
      return err({ kind: "PassengerNotFound", id });
    }
    const existing = this.all[idx]!;
    const deleted: Passenger = {
      ...existing,
      deletedAt: this.clock.now().toISOString(),
    };
    this.all[idx] = deleted;
    this.audit?.record(auth.value, "PassengerDeleted", "Passenger", id);
    return ok(deleted);
  }

  get(id: PassengerId): Result<Passenger, DomainError> {
    // Most recent record (active if exists, else last soft-deleted).
    const found = this.all.findLast((p) => p.id === id);
    return found !== undefined
      ? ok(found)
      : err({ kind: "PassengerNotFound", id });
  }

  list(): readonly Passenger[] {
    return this.all.filter((p) => p.deletedAt === undefined);
  }

  private findActiveIndex(id: PassengerId): number {
    return this.all.findIndex((p) => p.id === id && p.deletedAt === undefined);
  }
}
