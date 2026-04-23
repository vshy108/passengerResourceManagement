/** Reporting queries (RP-R1..R5). See specs/07-reporting.md. */
import { describe, it, expect, beforeEach } from "vitest";
import { AccessService } from "../../src/application/access.service.js";
import { PassengerService } from "../../src/application/passenger.service.js";
import { ReportingService } from "../../src/application/reporting.service.js";
import { ResourceService } from "../../src/application/resource.service.js";
import type { Actor } from "../../src/domain/actor.js";
import { toCrewLeadId } from "../../src/domain/crew-lead.js";
import { toPassengerId } from "../../src/domain/passenger.js";
import { toResourceId } from "../../src/domain/resource.js";
import { FakeClock } from "../../src/infrastructure/clock.js";
import { InMemoryUsageEventSink } from "../../src/infrastructure/in-memory-usage-event-sink.js";

const crew: Actor = { kind: "CrewLead", id: toCrewLeadId("CL1") };
const P1 = toPassengerId("P1");
const P2 = toPassengerId("P2");
const R1 = toResourceId("R1");
const R2 = toResourceId("R2");
const R3 = toResourceId("R3");
const passenger1: Actor = { kind: "Passenger", id: P1 };
const passenger2: Actor = { kind: "Passenger", id: P2 };

describe("Reporting Service", () => {
  let clock: FakeClock;
  let passengers: PassengerService;
  let resources: ResourceService;
  let sink: InMemoryUsageEventSink;
  let access: AccessService;
  let reporting: ReportingService;
  let counter: number;

  beforeEach(() => {
    clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"));
    passengers = new PassengerService(clock);
    resources = new ResourceService(clock);
    sink = new InMemoryUsageEventSink();
    counter = 0;
    access = new AccessService(passengers, resources, sink, clock, () => {
      counter += 1;
      return `E${String(counter)}`;
    });
    reporting = new ReportingService(sink);
  });

  describe("personalHistory (RP-R1)", () => {
    it("RP-S1: returns all events for a passenger in insertion order", () => {
      passengers.create(crew, { id: P1, name: "Ada", tier: "Gold" });
      resources.create(crew, {
        id: R1,
        name: "Lounge",
        category: "leisure",
        minTier: "Silver",
      });
      resources.create(crew, {
        id: R2,
        name: "Spa",
        category: "leisure",
        minTier: "Platinum",
      });

      access.useResource(passenger1, R1);
      clock.advance(1000);
      access.useResource(passenger1, R2);
      clock.advance(1000);
      access.useResource(passenger1, R1);

      const history = reporting.personalHistory(P1);
      expect(history).toHaveLength(3);
      expect(history.map((e) => e.outcome)).toEqual([
        "ALLOWED",
        "DENIED",
        "ALLOWED",
      ]);
    });

    it("RP-S2: unknown passenger returns empty array (not error)", () => {
      expect(reporting.personalHistory(P1)).toEqual([]);
    });

    it("RP-S3: excludes other passengers' events", () => {
      passengers.create(crew, { id: P1, name: "Ada", tier: "Silver" });
      passengers.create(crew, { id: P2, name: "Bea", tier: "Silver" });
      resources.create(crew, {
        id: R1,
        name: "Lounge",
        category: "leisure",
        minTier: "Silver",
      });

      access.useResource(passenger1, R1);
      access.useResource(passenger2, R1);
      access.useResource(passenger2, R1);

      const h1 = reporting.personalHistory(P1);
      expect(h1).toHaveLength(1);
      expect(h1[0]?.passengerId).toBe(P1);
    });
  });

  describe("aggregateByTier (RP-R2)", () => {
    it("RP-S4: counts allowed and denied at each tier-at-attempt", () => {
      passengers.create(crew, { id: P1, name: "Ada", tier: "Silver" });
      resources.create(crew, {
        id: R1,
        name: "Lounge",
        category: "leisure",
        minTier: "Silver",
      });
      resources.create(crew, {
        id: R2,
        name: "Spa",
        category: "leisure",
        minTier: "Gold",
      });

      access.useResource(passenger1, R1); // allowed Silver
      access.useResource(passenger1, R1); // allowed Silver
      access.useResource(passenger1, R2); // denied Silver

      const agg = reporting.aggregateByTier();
      expect(agg.Silver).toEqual({ allowed: 2, denied: 1 });
      expect(agg.Gold).toEqual({ allowed: 0, denied: 0 });
      expect(agg.Platinum).toEqual({ allowed: 0, denied: 0 });
    });

    it("RP-S5: all tiers appear even with no events", () => {
      const agg = reporting.aggregateByTier();
      expect(Object.keys(agg).sort()).toEqual(["Gold", "Platinum", "Silver"]);
      for (const t of Object.values(agg)) {
        expect(t).toEqual({ allowed: 0, denied: 0 });
      }
    });

    it("RP-S6: tier upgrade does not reclassify past events", () => {
      passengers.create(crew, { id: P1, name: "Ada", tier: "Silver" });
      resources.create(crew, {
        id: R1,
        name: "Lounge",
        category: "leisure",
        minTier: "Silver",
      });

      access.useResource(passenger1, R1); // Silver allowed
      passengers.changeTier(crew, P1, "Platinum");
      access.useResource(passenger1, R1); // Platinum allowed

      const agg = reporting.aggregateByTier();
      expect(agg.Silver.allowed).toBe(1);
      expect(agg.Platinum.allowed).toBe(1);
    });
  });

  describe("topResources (RP-R3, RP-R4)", () => {
    beforeEach(() => {
      passengers.create(crew, { id: P1, name: "Ada", tier: "Platinum" });
      for (const r of [R1, R2, R3]) {
        resources.create(crew, {
          id: r,
          name: r,
          category: "cat",
          minTier: "Silver",
        });
      }
    });

    it("RP-S7: returns top-n by allowed count, desc", () => {
      // R1 allowed x3, R2 allowed x1, R3 allowed x2
      access.useResource(passenger1, R1);
      access.useResource(passenger1, R1);
      access.useResource(passenger1, R1);
      access.useResource(passenger1, R2);
      access.useResource(passenger1, R3);
      access.useResource(passenger1, R3);

      expect(reporting.topResources(2)).toEqual([R1, R3]);
    });

    it("RP-S8: denied events are ignored", () => {
      passengers.create(crew, { id: P2, name: "Bea", tier: "Silver" });
      resources.create(crew, {
        id: toResourceId("R9"),
        name: "R9",
        category: "cat",
        minTier: "Platinum",
      });
      // P2 denied on R9 five times
      for (let i = 0; i < 5; i += 1) {
        access.useResource(passenger2, toResourceId("R9"));
      }
      // P1 allowed on R2 once
      access.useResource(passenger1, R2);

      expect(reporting.topResources(1)).toEqual([R2]);
    });

    it("RP-S9: ties break by resourceId ascending", () => {
      access.useResource(passenger1, R1);
      access.useResource(passenger1, R2);
      access.useResource(passenger1, R3);

      expect(reporting.topResources(3)).toEqual([R1, R2, R3]);
    });

    it("RP-S10: topResources(0) returns empty", () => {
      access.useResource(passenger1, R1);
      expect(reporting.topResources(0)).toEqual([]);
    });
  });
});
