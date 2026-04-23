import type { Actor } from "../domain/actor.js";
import type { DomainError } from "../domain/errors.js";
import type { Resource, ResourceId } from "../domain/resource.js";
import { err, ok, type Result } from "../domain/result.js";
import { canAccess, type Tier } from "../domain/tier.js";
import type { Clock } from "../infrastructure/clock.js";
import type { AuditEmitter } from "./audit-emitter.js";
import { requireCrewLead } from "./guards.js";

/**
 * Resource service.
 * See specs/04-resource.md
 */
export class ResourceService {
  private readonly all: Resource[] = [];

  constructor(
    private readonly clock: Clock,
    private readonly audit?: AuditEmitter,
  ) {}

  create(
    actor: Actor,
    input: {
      id: ResourceId;
      name: string;
      category: string;
      minTier: Tier;
    },
  ): Result<Resource, DomainError> {
    const auth = requireCrewLead(actor);
    if (!auth.ok) return auth;
    if (this.findActiveIndex(input.id) !== -1) {
      return err({ kind: "ResourceAlreadyExists", id: input.id });
    }
    const r: Resource = {
      id: input.id,
      name: input.name,
      category: input.category,
      minTier: input.minTier,
    };
    this.all.push(r);
    this.audit?.record(auth.value, "ResourceCreated", "Resource", input.id);
    return ok(r);
  }

  changeMinTier(
    actor: Actor,
    id: ResourceId,
    newTier: Tier,
  ): Result<Resource, DomainError> {
    const auth = requireCrewLead(actor);
    if (!auth.ok) return auth;
    const idx = this.findActiveIndex(id);
    if (idx === -1) {
      return err({ kind: "ResourceNotFound", id });
    }
    const updated: Resource = { ...this.all[idx]!, minTier: newTier };
    this.all[idx] = updated;
    this.audit?.record(auth.value, "ResourceMinTierChanged", "Resource", id, {
      newMinTier: newTier,
    });
    return ok(updated);
  }

  softDelete(actor: Actor, id: ResourceId): Result<Resource, DomainError> {
    const auth = requireCrewLead(actor);
    if (!auth.ok) return auth;
    const idx = this.findActiveIndex(id);
    if (idx === -1) {
      return err({ kind: "ResourceNotFound", id });
    }
    const deleted: Resource = {
      ...this.all[idx]!,
      deletedAt: this.clock.now().toISOString(),
    };
    this.all[idx] = deleted;
    this.audit?.record(auth.value, "ResourceDeleted", "Resource", id);
    return ok(deleted);
  }

  get(id: ResourceId): Result<Resource, DomainError> {
    for (let i = this.all.length - 1; i >= 0; i -= 1) {
      const r = this.all[i]!;
      if (r.id === id) return ok(r);
    }
    return err({ kind: "ResourceNotFound", id });
  }

  list(): readonly Resource[] {
    return this.all.filter((r) => r.deletedAt === undefined);
  }

  listAccessibleFor(tier: Tier): readonly Resource[] {
    return this.list().filter((r) => canAccess(tier, r.minTier));
  }

  private findActiveIndex(id: ResourceId): number {
    return this.all.findIndex((r) => r.id === id && r.deletedAt === undefined);
  }
}
