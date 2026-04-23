import type { Actor } from "../domain/actor.js";
import type { DomainError } from "../domain/errors.js";
import type { Passenger, PassengerId } from "../domain/passenger.js";
import type { Result } from "../domain/result.js";
import type { Tier } from "../domain/tier.js";
import type { Clock } from "../infrastructure/clock.js";

/**
 * Passenger service.
 * See specs/03-passenger.md
 */
export class PassengerService {
  constructor(private readonly clock: Clock) {}

  create(
    _actor: Actor,
    _input: { id: PassengerId; name: string; tier: Tier },
  ): Result<Passenger, DomainError> {
    throw new Error("not implemented");
  }

  changeTier(
    _actor: Actor,
    _id: PassengerId,
    _newTier: Tier,
  ): Result<Passenger, DomainError> {
    throw new Error("not implemented");
  }

  softDelete(
    _actor: Actor,
    _id: PassengerId,
  ): Result<Passenger, DomainError> {
    throw new Error("not implemented");
  }

  get(_id: PassengerId): Result<Passenger, DomainError> {
    throw new Error("not implemented");
  }

  list(): readonly Passenger[] {
    throw new Error("not implemented");
  }
}
