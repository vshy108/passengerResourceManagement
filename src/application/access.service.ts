import type { Actor } from "../domain/actor.js";
import type { DomainError } from "../domain/errors.js";
import type { ResourceId } from "../domain/resource.js";
import { err, type Result } from "../domain/result.js";
import type { UsageEvent } from "../domain/usage-event.js";
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
    private readonly _passengers: PassengerService,
    private readonly _resources: ResourceService,
    private readonly _sink: UsageEventSink,
    private readonly _clock: Clock,
    private readonly _idGen: () => string,
  ) {}

  useResource(
    _actor: Actor,
    _resourceId: ResourceId,
  ): Result<UsageEvent, DomainError> {
    return err({ kind: "UnauthorizedActor", required: "Passenger" });
  }
}
