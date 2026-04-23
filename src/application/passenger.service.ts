import type { Actor } from "../domain/actor.js";
import type { DomainError } from "../domain/errors.js";
import type { Passenger, PassengerId } from "../domain/passenger.js";
import { err, ok, type Result } from "../domain/result.js";
import type { Tier } from "../domain/tier.js";
import type { Clock } from "../infrastructure/clock.js";
import type { AuditEmitter } from "./audit-emitter.js";
import { requireCrewLead } from "./guards.js";

/**
 * Passenger service — create, re-tier, and soft-delete passengers.
 *
 * Every mutation requires a Crew Lead actor (PS-R1, PS-R3, PS-R5) and,
 * on success, emits a matching `AdminEvent` through the injected
 * `AuditEmitter`. Soft-deleted passengers are preserved so historical
 * usage events stay resolvable via `get()`.
 * See specs/03-passenger.md.
 */
export class PassengerService {
  /** All passengers ever created, including soft-deleted ones (for audit). */
  private readonly all: Passenger[] = [];

  /**
   * @param clock Used to timestamp soft-deletions.
   * @param audit Optional emitter; omit to disable audit events.
   */
  constructor(
    private readonly clock: Clock,
    private readonly audit?: AuditEmitter,
  ) {}

  /**
   * PS-R1..R2: create a new passenger.
   *
   * Rejects if the caller is not a Crew Lead or if an **active**
   * passenger already holds the id (the id may be re-used once the
   * previous holder is soft-deleted — PS-S9).
   */
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

  /**
   * PS-R3..R4: change a passenger's tier.
   *
   * Setting the same tier is an idempotent success (PS-S7) and still
   * emits a `PassengerTierChanged` event for audit symmetry.
   */
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

  /**
   * PS-R5..R6: soft-delete a passenger by stamping `deletedAt`.
   *
   * The record is retained so historical usage events continue to
   * resolve; the id becomes available for reuse via `create`.
   */
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

  /**
   * Resolve a passenger by id.
   *
   * Returns the *most recent* record — the currently active passenger
   * if one exists, otherwise the last soft-deleted version (PS-S8).
   */
  get(id: PassengerId): Result<Passenger, DomainError> {
    const found = this.all.findLast((p) => p.id === id);
    return found !== undefined
      ? ok(found)
      : err({ kind: "PassengerNotFound", id });
  }

  /** Active passengers in insertion order (soft-deleted excluded). */
  list(): readonly Passenger[] {
    return this.all.filter((p) => p.deletedAt === undefined);
  }

  private findActiveIndex(id: PassengerId): number {
    return this.all.findIndex((p) => p.id === id && p.deletedAt === undefined);
  }
}
