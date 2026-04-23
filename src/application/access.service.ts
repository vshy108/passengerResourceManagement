import type { Actor } from "../domain/actor.js";
import type { DomainError } from "../domain/errors.js";
import type { ResourceId } from "../domain/resource.js";
import { err, ok, type Result } from "../domain/result.js";
import { canAccess } from "../domain/tier.js";
import {
  toUsageEventId,
  type UsageEvent,
  type UsageOutcome,
} from "../domain/usage-event.js";
import type { PassengerService } from "./passenger.service.js";
import type { ResourceService } from "./resource.service.js";
import type { UsageEventSink } from "./usage-event-sink.js";
import type { Clock } from "../infrastructure/clock.js";

/**
 * Access service — runtime permission check + usage-event emission.
 *
 * Orchestrates `PassengerService`, `ResourceService`, and the tier
 * policy from `domain/tier.ts`. Every attempt — allowed **or** denied
 * — is appended to the `UsageEventSink` (AC-R5). Tier values are
 * snapshotted onto the event at the moment of attempt so subsequent
 * tier changes never rewrite history. See specs/05-access.md.
 */
export class AccessService {
  /**
   * @param passengers Source of truth for passenger lookup.
   * @param resources  Source of truth for resource lookup.
   * @param sink       Append-only log of usage events.
   * @param clock      Injected clock for event timestamps.
   * @param idGen      Injected id generator for event ids.
   */
  constructor(
    private readonly passengers: PassengerService,
    private readonly resources: ResourceService,
    private readonly sink: UsageEventSink,
    private readonly clock: Clock,
    private readonly idGen: () => string,
  ) {}

  /**
   * Attempt to use a resource on behalf of a passenger.
   *
   * Enforces, in order: caller kind (AC-R1), passenger existence
   * (AC-R2), resource existence (AC-R3), tier policy (AC-R4). Always
   * emits exactly one `UsageEvent` on AC-R2+ failures and above.
   *
   * @returns `ok(event)` on allowed access, or a `DomainError`:
   *   - `UnauthorizedActor`   — caller is not a Passenger
   *   - `PassengerNotFound`   — caller is not an active passenger
   *   - `ResourceNotFound`    — target is not an active resource
   *   - `AccessDenied`        — tier policy rejected (event still emitted)
   */
  useResource(
    actor: Actor,
    resourceId: ResourceId,
  ): Result<UsageEvent, DomainError> {
    // AC-R1: only Passenger actors may consume resources.
    if (actor.kind !== "Passenger") {
      return err({ kind: "UnauthorizedActor", required: "Passenger" });
    }

    // AC-R2: subject must be an active passenger.
    const passenger = this.passengers.list().find((p) => p.id === actor.id);
    if (passenger === undefined) {
      return err({ kind: "PassengerNotFound", id: actor.id });
    }

    // AC-R3: target must be an active resource.
    const resource = this.resources.list().find((r) => r.id === resourceId);
    if (resource === undefined) {
      return err({ kind: "ResourceNotFound", id: resourceId });
    }

    // AC-R4 + AC-R5: snapshot tiers, emit event, then return.
    const allowed = canAccess(passenger.tier, resource.minTier);
    const outcome: UsageOutcome = allowed ? "ALLOWED" : "DENIED";
    const event: UsageEvent = {
      id: toUsageEventId(this.idGen()),
      passengerId: passenger.id,
      resourceId: resource.id,
      tierAtAttempt: passenger.tier,
      minTierAtAttempt: resource.minTier,
      timestamp: this.clock.now().toISOString(),
      outcome,
    };
    this.sink.record(event);

    return allowed
      ? ok(event)
      : err({
          kind: "AccessDenied",
          passengerId: passenger.id,
          resourceId: resource.id,
        });
  }
}
