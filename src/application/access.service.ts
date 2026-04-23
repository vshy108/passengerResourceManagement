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
 * Access service — runtime permission check + audit emission.
 * See specs/05-access.md
 */
export class AccessService {
  constructor(
    private readonly passengers: PassengerService,
    private readonly resources: ResourceService,
    private readonly sink: UsageEventSink,
    private readonly clock: Clock,
    private readonly idGen: () => string,
  ) {}

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
