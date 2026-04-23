import { describe, it, expect, beforeEach } from "vitest";
import { PassengerService } from "../../src/application/passenger.service.js";
import type { Actor } from "../../src/domain/actor.js";
import { toCrewLeadId } from "../../src/domain/crew-lead.js";
import { toPassengerId } from "../../src/domain/passenger.js";
import { FakeClock } from "../../src/infrastructure/clock.js";

const crew: Actor = { kind: "CrewLead", id: toCrewLeadId("CL1") };
const P1 = toPassengerId("P1");
const P2 = toPassengerId("P2");
const P3 = toPassengerId("P3");
const passengerActor: Actor = { kind: "Passenger", id: P1 };

describe("Passenger Service", () => {
  let svc: PassengerService;
  let clock: FakeClock;

  beforeEach(() => {
    clock = new FakeClock();
    svc = new PassengerService(clock);
  });

  describe("create (PS-R1, PS-R2)", () => {
    it("PS-S1: Crew Lead can create a passenger", () => {
      const r = svc.create(crew, { id: P1, name: "Alice", tier: "Silver" });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.tier).toBe("Silver");
      expect(svc.list()).toHaveLength(1);
    });

    it("PS-S2: non-Crew-Lead cannot create a passenger", () => {
      const r = svc.create(passengerActor, {
        id: P1,
        name: "Alice",
        tier: "Silver",
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("UnauthorizedActor");
      expect(svc.list()).toHaveLength(0);
    });

    it("PS-S3: duplicate active id is rejected", () => {
      svc.create(crew, { id: P1, name: "Alice", tier: "Silver" });
      const r = svc.create(crew, { id: P1, name: "Alice2", tier: "Gold" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("PassengerAlreadyExists");
    });
  });

  describe("changeTier (PS-R3, PS-R4)", () => {
    it("PS-S4: Crew Lead can upgrade tier", () => {
      svc.create(crew, { id: P1, name: "Alice", tier: "Silver" });
      const r = svc.changeTier(crew, P1, "Platinum");
      expect(r.ok).toBe(true);
      const g = svc.get(P1);
      if (g.ok) expect(g.value.tier).toBe("Platinum");
    });

    it("PS-S5: non-Crew-Lead cannot change tier", () => {
      svc.create(crew, { id: P1, name: "Alice", tier: "Silver" });
      const r = svc.changeTier(passengerActor, P1, "Gold");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("UnauthorizedActor");
    });

    it("PS-S6: unknown passenger returns PassengerNotFound", () => {
      const r = svc.changeTier(crew, toPassengerId("PX"), "Gold");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("PassengerNotFound");
    });

    it("PS-S7: changing to same tier is idempotent success", () => {
      svc.create(crew, { id: P1, name: "Alice", tier: "Gold" });
      const r = svc.changeTier(crew, P1, "Gold");
      expect(r.ok).toBe(true);
      const g = svc.get(P1);
      if (g.ok) expect(g.value.tier).toBe("Gold");
    });
  });

  describe("softDelete (PS-R5, PS-R6)", () => {
    it("PS-S8: soft-deleted passenger is excluded from list but still resolvable by get", () => {
      svc.create(crew, { id: P1, name: "Alice", tier: "Silver" });
      const del = svc.softDelete(crew, P1);
      expect(del.ok).toBe(true);
      expect(svc.list()).toHaveLength(0);
      const g = svc.get(P1);
      expect(g.ok).toBe(true);
      if (g.ok) expect(g.value.deletedAt).toBeDefined();
    });

    it("PS-S9: id of soft-deleted passenger can be re-used for a new active passenger", () => {
      svc.create(crew, { id: P1, name: "Alice", tier: "Silver" });
      svc.softDelete(crew, P1);
      const r = svc.create(crew, { id: P1, name: "Alice2", tier: "Gold" });
      expect(r.ok).toBe(true);
      expect(svc.list()).toHaveLength(1);
    });

    it("non-Crew-Lead cannot softDelete", () => {
      svc.create(crew, { id: P1, name: "Alice", tier: "Silver" });
      const r = svc.softDelete(passengerActor, P1);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("UnauthorizedActor");
    });

    it("softDelete of unknown passenger returns PassengerNotFound", () => {
      const r = svc.softDelete(crew, P1);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("PassengerNotFound");
    });

    it("get of unknown passenger returns PassengerNotFound", () => {
      const r = svc.get(P1);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("PassengerNotFound");
    });

    it("get scans past non-matching records to find the target", () => {
      svc.create(crew, { id: P1, name: "A", tier: "Silver" });
      svc.create(crew, { id: P2, name: "B", tier: "Gold" });
      // Looking up P1 forces the loop to skip the most-recent (P2) first.
      const r = svc.get(P1);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.id).toBe(P1);
    });
  });

  describe("list (PS-R8)", () => {
    it("PS-S10: list returns active passengers in insertion order", () => {
      svc.create(crew, { id: P1, name: "Alice", tier: "Silver" });
      svc.create(crew, { id: P2, name: "Bob", tier: "Gold" });
      svc.create(crew, { id: P3, name: "Cat", tier: "Platinum" });
      const ids = svc.list().map((p) => p.id);
      expect(ids).toEqual([P1, P2, P3]);
    });
  });
});
