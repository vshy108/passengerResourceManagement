/** Resource rules (RS-R1..R6). See specs/04-resource.md. */
import { describe, it, expect, beforeEach } from "vitest";
import { ResourceService } from "../../src/application/resource.service.js";
import type { Actor } from "../../src/domain/actor.js";
import { toCrewLeadId } from "../../src/domain/crew-lead.js";
import { toPassengerId } from "../../src/domain/passenger.js";
import { toResourceId } from "../../src/domain/resource.js";
import { FakeClock } from "../../src/infrastructure/clock.js";

const crew: Actor = { kind: "CrewLead", id: toCrewLeadId("CL1") };
const passenger: Actor = {
  kind: "Passenger",
  id: toPassengerId("P1"),
};
const R1 = toResourceId("R1");
const R2 = toResourceId("R2");
const R3 = toResourceId("R3");

describe("Resource Service", () => {
  let svc: ResourceService;

  beforeEach(() => {
    svc = new ResourceService(new FakeClock());
  });

  describe("create (RS-R1, RS-R2)", () => {
    it("RS-S1: Crew Lead can create a resource", () => {
      const r = svc.create(crew, {
        id: R1,
        name: "Food Station",
        category: "food",
        minTier: "Silver",
      });
      expect(r.ok).toBe(true);
      expect(svc.list()).toHaveLength(1);
    });

    it("RS-S2: non-Crew-Lead cannot create a resource", () => {
      const r = svc.create(passenger, {
        id: R1,
        name: "Food Station",
        category: "food",
        minTier: "Silver",
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("UnauthorizedActor");
    });

    it("RS-S3: duplicate active id is rejected", () => {
      svc.create(crew, {
        id: R1,
        name: "Food Station",
        category: "food",
        minTier: "Silver",
      });
      const r = svc.create(crew, {
        id: R1,
        name: "Other",
        category: "food",
        minTier: "Silver",
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("ResourceAlreadyExists");
    });
  });

  describe("changeMinTier (RS-R3)", () => {
    it("RS-S4: Crew Lead can change minTier", () => {
      svc.create(crew, {
        id: R1,
        name: "Pod",
        category: "sleep",
        minTier: "Silver",
      });
      const r = svc.changeMinTier(crew, R1, "Platinum");
      expect(r.ok).toBe(true);
      const g = svc.get(R1);
      if (g.ok) expect(g.value.minTier).toBe("Platinum");
    });

    it("RS-S5: non-Crew-Lead cannot change minTier", () => {
      svc.create(crew, {
        id: R1,
        name: "Pod",
        category: "sleep",
        minTier: "Silver",
      });
      const r = svc.changeMinTier(passenger, R1, "Gold");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("UnauthorizedActor");
    });

    it("RS-S6: unknown resource returns ResourceNotFound", () => {
      const r = svc.changeMinTier(crew, toResourceId("RX"), "Gold");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("ResourceNotFound");
    });
  });

  describe("softDelete (RS-R4, RS-R5)", () => {
    it("RS-S7: soft-deleted resource excluded from list, still resolvable by get", () => {
      svc.create(crew, {
        id: R1,
        name: "Pod",
        category: "sleep",
        minTier: "Silver",
      });
      const del = svc.softDelete(crew, R1);
      expect(del.ok).toBe(true);
      expect(svc.list()).toHaveLength(0);
      const g = svc.get(R1);
      if (g.ok) expect(g.value.deletedAt).toBeDefined();
    });

    it("RS-S8: mutating a soft-deleted resource returns ResourceNotFound", () => {
      svc.create(crew, {
        id: R1,
        name: "Pod",
        category: "sleep",
        minTier: "Silver",
      });
      svc.softDelete(crew, R1);
      const r = svc.changeMinTier(crew, R1, "Gold");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("ResourceNotFound");
    });
  });

  describe("listing (RS-R6, RS-R7)", () => {
    it("RS-S9: list returns resources in insertion order", () => {
      svc.create(crew, {
        id: R1,
        name: "R1",
        category: "x",
        minTier: "Silver",
      });
      svc.create(crew, {
        id: R2,
        name: "R2",
        category: "x",
        minTier: "Gold",
      });
      svc.create(crew, {
        id: R3,
        name: "R3",
        category: "x",
        minTier: "Platinum",
      });
      expect(svc.list().map((r) => r.id)).toEqual([R1, R2, R3]);
    });

    it("RS-S10: listAccessibleFor('Gold') returns Silver and Gold resources only", () => {
      svc.create(crew, {
        id: R1,
        name: "S1",
        category: "x",
        minTier: "Silver",
      });
      svc.create(crew, {
        id: R2,
        name: "G1",
        category: "x",
        minTier: "Gold",
      });
      svc.create(crew, {
        id: R3,
        name: "P1",
        category: "x",
        minTier: "Platinum",
      });
      expect(svc.listAccessibleFor("Gold").map((r) => r.id)).toEqual([R1, R2]);
    });

    it("RS-S11: soft-deleted resources are excluded from listAccessibleFor", () => {
      svc.create(crew, {
        id: R1,
        name: "S1",
        category: "x",
        minTier: "Silver",
      });
      svc.softDelete(crew, R1);
      expect(svc.listAccessibleFor("Platinum")).toHaveLength(0);
    });

    it("non-Crew-Lead cannot softDelete a resource", () => {
      svc.create(crew, {
        id: R1,
        name: "S1",
        category: "x",
        minTier: "Silver",
      });
      const r = svc.softDelete(passenger, R1);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("UnauthorizedActor");
    });

    it("softDelete of unknown resource returns ResourceNotFound", () => {
      const r = svc.softDelete(crew, R1);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("ResourceNotFound");
    });

    it("get of unknown resource returns ResourceNotFound", () => {
      const r = svc.get(R1);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("ResourceNotFound");
    });

    it("get scans past non-matching records to find the target", () => {
      svc.create(crew, {
        id: R1,
        name: "R1",
        category: "x",
        minTier: "Silver",
      });
      svc.create(crew, {
        id: R2,
        name: "R2",
        category: "x",
        minTier: "Gold",
      });
      const r = svc.get(R1);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.id).toBe(R1);
    });
  });
});
