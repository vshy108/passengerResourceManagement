import { describe, it, expect, beforeEach } from "vitest";
import { AccessService } from "../../src/application/access.service.js";
import { PassengerService } from "../../src/application/passenger.service.js";
import { ResourceService } from "../../src/application/resource.service.js";
import type { Actor } from "../../src/domain/actor.js";
import { toCrewLeadId } from "../../src/domain/crew-lead.js";
import { toPassengerId } from "../../src/domain/passenger.js";
import { toResourceId } from "../../src/domain/resource.js";
import { FakeClock } from "../../src/infrastructure/clock.js";
import { InMemoryUsageEventSink } from "../../src/infrastructure/in-memory-usage-event-sink.js";

const crew: Actor = { kind: "CrewLead", id: toCrewLeadId("CL1") };
const P1 = toPassengerId("P1");
const passenger: Actor = { kind: "Passenger", id: P1 };
const R1 = toResourceId("R1");
const R2 = toResourceId("R2");

describe("Access Service", () => {
  let clock: FakeClock;
  let passengers: PassengerService;
  let resources: ResourceService;
  let sink: InMemoryUsageEventSink;
  let svc: AccessService;
  let counter: number;

  beforeEach(() => {
    clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"));
    passengers = new PassengerService(clock);
    resources = new ResourceService(clock);
    sink = new InMemoryUsageEventSink();
    counter = 0;
    svc = new AccessService(passengers, resources, sink, clock, () => {
      counter += 1;
      return `E${String(counter)}`;
    });
  });

  describe("authorization (AC-R1)", () => {
    it("AC-S1: Crew Lead actor is rejected and no event emitted", () => {
      passengers.create(crew, { id: P1, name: "Ada", tier: "Platinum" });
      resources.create(crew, {
        id: R1,
        name: "Lounge",
        category: "leisure",
        minTier: "Silver",
      });

      const r = svc.useResource(crew, R1);

      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("UnauthorizedActor");
      expect(sink.list()).toHaveLength(0);
    });
  });

  describe("subject / target validity (AC-R2, AC-R3)", () => {
    it("AC-S2: unknown passenger -> PassengerNotFound, no event", () => {
      resources.create(crew, {
        id: R1,
        name: "Lounge",
        category: "leisure",
        minTier: "Silver",
      });

      const r = svc.useResource(passenger, R1);

      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("PassengerNotFound");
      expect(sink.list()).toHaveLength(0);
    });

    it("AC-S3: soft-deleted passenger -> PassengerNotFound, no event", () => {
      passengers.create(crew, { id: P1, name: "Ada", tier: "Silver" });
      passengers.softDelete(crew, P1);
      resources.create(crew, {
        id: R1,
        name: "Lounge",
        category: "leisure",
        minTier: "Silver",
      });

      const r = svc.useResource(passenger, R1);

      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("PassengerNotFound");
      expect(sink.list()).toHaveLength(0);
    });

    it("AC-S4: unknown resource -> ResourceNotFound, no event", () => {
      passengers.create(crew, { id: P1, name: "Ada", tier: "Silver" });

      const r = svc.useResource(passenger, R1);

      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("ResourceNotFound");
      expect(sink.list()).toHaveLength(0);
    });

    it("AC-S5: soft-deleted resource -> ResourceNotFound, no event", () => {
      passengers.create(crew, { id: P1, name: "Ada", tier: "Silver" });
      resources.create(crew, {
        id: R1,
        name: "Lounge",
        category: "leisure",
        minTier: "Silver",
      });
      resources.softDelete(crew, R1);

      const r = svc.useResource(passenger, R1);

      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("ResourceNotFound");
      expect(sink.list()).toHaveLength(0);
    });
  });

  describe("allow / deny (AC-R4)", () => {
    it("AC-S6: Platinum passenger + Silver resource -> ALLOWED event", () => {
      passengers.create(crew, { id: P1, name: "Ada", tier: "Platinum" });
      resources.create(crew, {
        id: R1,
        name: "Lounge",
        category: "leisure",
        minTier: "Silver",
      });

      const r = svc.useResource(passenger, R1);

      expect(r.ok).toBe(true);
      const events = sink.list();
      expect(events).toHaveLength(1);
      expect(events[0]?.outcome).toBe("ALLOWED");
      expect(events[0]?.passengerId).toBe(P1);
      expect(events[0]?.resourceId).toBe(R1);
    });

    it("AC-S7: Silver passenger + Gold resource -> DENIED event", () => {
      passengers.create(crew, { id: P1, name: "Ada", tier: "Silver" });
      resources.create(crew, {
        id: R1,
        name: "Spa",
        category: "leisure",
        minTier: "Gold",
      });

      const r = svc.useResource(passenger, R1);

      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error.kind).toBe("AccessDenied");
      const events = sink.list();
      expect(events).toHaveLength(1);
      expect(events[0]?.outcome).toBe("DENIED");
    });
  });

  describe("snapshots (AC-R5, AC-R6, AC-I2)", () => {
    it("AC-S8: tier upgrade does not mutate prior event snapshots", () => {
      passengers.create(crew, { id: P1, name: "Ada", tier: "Silver" });
      resources.create(crew, {
        id: R1,
        name: "Lounge",
        category: "leisure",
        minTier: "Silver",
      });

      svc.useResource(passenger, R1);
      passengers.changeTier(crew, P1, "Platinum");

      const events = sink.list();
      expect(events).toHaveLength(1);
      expect(events[0]?.tierAtAttempt).toBe("Silver");
      expect(events[0]?.minTierAtAttempt).toBe("Silver");
    });

    it("AC-S9: prior DENIED stays; subsequent attempt after upgrade is ALLOWED", () => {
      passengers.create(crew, { id: P1, name: "Ada", tier: "Silver" });
      resources.create(crew, {
        id: R2,
        name: "Spa",
        category: "leisure",
        minTier: "Gold",
      });

      const r1 = svc.useResource(passenger, R2);
      expect(r1.ok).toBe(false);

      passengers.changeTier(crew, P1, "Gold");
      clock.advance(1000);
      const r2 = svc.useResource(passenger, R2);
      expect(r2.ok).toBe(true);

      const events = sink.list();
      expect(events).toHaveLength(2);
      expect(events[0]?.outcome).toBe("DENIED");
      expect(events[0]?.tierAtAttempt).toBe("Silver");
      expect(events[1]?.outcome).toBe("ALLOWED");
      expect(events[1]?.tierAtAttempt).toBe("Gold");
    });
  });

  describe("determinism (AC-R7)", () => {
    it("AC-S10: event timestamp comes from injected clock", () => {
      const fixed = new Date("2026-06-15T12:00:00.000Z");
      clock.set(fixed);
      passengers.create(crew, { id: P1, name: "Ada", tier: "Silver" });
      resources.create(crew, {
        id: R1,
        name: "Lounge",
        category: "leisure",
        minTier: "Silver",
      });

      svc.useResource(passenger, R1);

      const events = sink.list();
      expect(events[0]?.timestamp).toBe(fixed.toISOString());
    });
  });
});
