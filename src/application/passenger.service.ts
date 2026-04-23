import type { Actor } from "../domain/actor.js";
import type { DomainError } from "../domain/errors.js";
import type { Passenger, PassengerId } from "../domain/passenger.js";
import { err, ok, type Result } from "../domain/result.js";
import type { Tier } from "../domain/tier.js";
import type { Clock } from "../infrastructure/clock.js";
import type { AdminEventSink } from "./admin-event-sink.js";

/**
 * Passenger service.
 * See specs/03-passenger.md
 */
export class PassengerService {
  /** All passengers ever created, including soft-deleted ones (for audit). */
  private readonly all: Passenger[] = [];

  constructor(
    private readonly clock: Clock,
    private readonly sink?: AdminEventSink,
    private readonly idGen?: () => string,
  ) {}

  create(
    actor: Actor,
    input: { id: PassengerId; name: string; tier: Tier },
  ): Result<Passenger, DomainError> {
    if (actor.kind !== "CrewLead") {
      return err({ kind: "UnauthorizedActor", required: "CrewLead" });
    }
    if (this.findActive(input.id) !== undefined) {
      return err({ kind: "PassengerAlreadyExists", id: input.id });
    }
    const passenger: Passenger = {
      id: input.id,
      name: input.name,
      tier: input.tier,
    };
    this.all.push(passenger);
    return ok(passenger);
  }

  changeTier(
    actor: Actor,
    id: PassengerId,
    newTier: Tier,
  ): Result<Passenger, DomainError> {
    if (actor.kind !== "CrewLead") {
      return err({ kind: "UnauthorizedActor", required: "CrewLead" });
    }
    const idx = this.findActiveIndex(id);
    if (idx === -1) {
      return err({ kind: "PassengerNotFound", id });
    }
    const existing = this.all[idx]!;
    const updated: Passenger = { ...existing, tier: newTier };
    this.all[idx] = updated;
    return ok(updated);
  }

  softDelete(actor: Actor, id: PassengerId): Result<Passenger, DomainError> {
    if (actor.kind !== "CrewLead") {
      return err({ kind: "UnauthorizedActor", required: "CrewLead" });
    }
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
    return ok(deleted);
  }

  get(id: PassengerId): Result<Passenger, DomainError> {
    // Most recent record (active if exists, else last soft-deleted).
    for (let i = this.all.length - 1; i >= 0; i -= 1) {
      const p = this.all[i]!;
      if (p.id === id) {
        return ok(p);
      }
    }
    return err({ kind: "PassengerNotFound", id });
  }

  list(): readonly Passenger[] {
    return this.all.filter((p) => p.deletedAt === undefined);
  }

  private findActive(id: PassengerId): Passenger | undefined {
    return this.all.find((p) => p.id === id && p.deletedAt === undefined);
  }

  private findActiveIndex(id: PassengerId): number {
    return this.all.findIndex((p) => p.id === id && p.deletedAt === undefined);
  }
}
