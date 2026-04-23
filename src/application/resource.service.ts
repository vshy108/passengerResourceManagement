import type { Actor } from "../domain/actor.js";
import type { DomainError } from "../domain/errors.js";
import type { Resource, ResourceId } from "../domain/resource.js";
import type { Result } from "../domain/result.js";
import type { Tier } from "../domain/tier.js";
import type { Clock } from "../infrastructure/clock.js";

/**
 * Resource service.
 * See specs/04-resource.md
 */
export class ResourceService {
  constructor(private readonly clock: Clock) {}

  create(
    _actor: Actor,
    _input: {
      id: ResourceId;
      name: string;
      category: string;
      minTier: Tier;
    },
  ): Result<Resource, DomainError> {
    throw new Error("not implemented");
  }

  changeMinTier(
    _actor: Actor,
    _id: ResourceId,
    _newTier: Tier,
  ): Result<Resource, DomainError> {
    throw new Error("not implemented");
  }

  softDelete(
    _actor: Actor,
    _id: ResourceId,
  ): Result<Resource, DomainError> {
    throw new Error("not implemented");
  }

  get(_id: ResourceId): Result<Resource, DomainError> {
    throw new Error("not implemented");
  }

  list(): readonly Resource[] {
    throw new Error("not implemented");
  }

  listAccessibleFor(_tier: Tier): readonly Resource[] {
    throw new Error("not implemented");
  }
}
