import type { Actor } from "../domain/actor.js";
import type { DomainError } from "../domain/errors.js";
import type { Resource, ResourceId } from "../domain/resource.js";
import { err, ok, type Result } from "../domain/result.js";
import { canAccess, type Tier } from "../domain/tier.js";
import type { Clock } from "../infrastructure/clock.js";
import type { AuditEmitter } from "./audit-emitter.js";
import { requireCrewLead } from "./guards.js";

/**
 * Resource service — create, re-tier, and soft-delete resources.
 *
 * Mirror of `PassengerService` for the resource aggregate. Every
 * mutation requires a Crew Lead actor (RS-R1, RS-R3, RS-R5) and emits
 * the matching `AdminEvent`. See specs/04-resource.md.
 */
export class ResourceService {
  private readonly all: Resource[] = [];

  /**
   * @param clock Used to timestamp soft-deletions.
   * @param audit Optional emitter; omit to disable audit events.
   */
  constructor(
    private readonly clock: Clock,
    private readonly audit?: AuditEmitter,
  ) {}

  /** RS-R1..R2: create a new resource. Duplicate active id rejected. */
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

  /** RS-R3..R4: adjust a resource's minimum tier. */
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

  /** RS-R5..R6: soft-delete a resource by stamping `deletedAt`. */
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

  /** Most recent record for the id (active, or last soft-deleted). */
  get(id: ResourceId): Result<Resource, DomainError> {
    const found = this.all.findLast((r) => r.id === id);
    return found !== undefined
      ? ok(found)
      : err({ kind: "ResourceNotFound", id });
  }

  /** Active resources in insertion order (soft-deleted excluded). */
  list(): readonly Resource[] {
    return this.all.filter((r) => r.deletedAt === undefined);
  }

  /** Active resources whose minimum tier the given tier satisfies (TP-R2). */
  listAccessibleFor(tier: Tier): readonly Resource[] {
    return this.list().filter((r) => canAccess(tier, r.minTier));
  }

  private findActiveIndex(id: ResourceId): number {
    return this.all.findIndex((r) => r.id === id && r.deletedAt === undefined);
  }
}
