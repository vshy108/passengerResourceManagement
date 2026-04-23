/** Audit emission on admin mutations (AU-R1..R6). See specs/06-audit.md. */
import { describe, it, expect, beforeEach } from "vitest";
import { AuditEmitter } from "../../src/application/audit-emitter.js";
import { CrewLeadService } from "../../src/application/crew-lead.service.js";
import { PassengerService } from "../../src/application/passenger.service.js";
import { ResourceService } from "../../src/application/resource.service.js";
import type { Actor } from "../../src/domain/actor.js";
import { toCrewLeadId, type CrewLead } from "../../src/domain/crew-lead.js";
import { toPassengerId } from "../../src/domain/passenger.js";
import { toResourceId } from "../../src/domain/resource.js";
import { FakeClock } from "../../src/infrastructure/clock.js";
import { InMemoryAdminEventSink } from "../../src/infrastructure/in-memory-admin-event-sink.js";

const CL1 = toCrewLeadId("CL1");
const CL2 = toCrewLeadId("CL2");
const CL3 = toCrewLeadId("CL3");
const CL4 = toCrewLeadId("CL4");
const crew: Actor = { kind: "CrewLead", id: CL1 };
const passenger: Actor = { kind: "Passenger", id: toPassengerId("P1") };
const P1 = toPassengerId("P1");
const R1 = toResourceId("R1");

const threeLeads: CrewLead[] = [
  { id: CL1, name: "Alice" },
  { id: CL2, name: "Bob" },
  { id: CL3, name: "Carol" },
];

describe("Audit (admin events)", () => {
  let clock: FakeClock;
  let sink: InMemoryAdminEventSink;
  let audit: AuditEmitter;
  let counter: number;
  const idGen = (): string => {
    counter += 1;
    return `A${String(counter)}`;
  };

  beforeEach(() => {
    clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"));
    sink = new InMemoryAdminEventSink();
    counter = 0;
    audit = new AuditEmitter({ clock, sink, idGen });
  });

  describe("passenger mutations (AU-S1..S3)", () => {
    it("AU-S1: PassengerCreated on successful create", () => {
      const svc = new PassengerService(clock, audit);
      svc.create(crew, { id: P1, name: "Ada", tier: "Silver" });

      const events = sink.list();
      expect(events).toHaveLength(1);
      expect(events[0]?.action).toBe("PassengerCreated");
      expect(events[0]?.targetKind).toBe("Passenger");
      expect(events[0]?.targetId).toBe(P1);
      expect(events[0]?.actorId).toBe(CL1);
    });

    it("AU-S2: PassengerTierChanged on successful changeTier", () => {
      const svc = new PassengerService(clock, audit);
      svc.create(crew, { id: P1, name: "Ada", tier: "Silver" });
      svc.changeTier(crew, P1, "Gold");

      const events = sink.list();
      expect(events).toHaveLength(2);
      expect(events[1]?.action).toBe("PassengerTierChanged");
      expect(events[1]?.details?.newTier).toBe("Gold");
    });

    it("AU-S3: PassengerDeleted on successful softDelete", () => {
      const svc = new PassengerService(clock, audit);
      svc.create(crew, { id: P1, name: "Ada", tier: "Silver" });
      svc.softDelete(crew, P1);

      const events = sink.list();
      expect(events).toHaveLength(2);
      expect(events[1]?.action).toBe("PassengerDeleted");
    });
  });

  describe("resource mutations (AU-S4..S6)", () => {
    it("AU-S4: ResourceCreated on successful create", () => {
      const svc = new ResourceService(clock, audit);
      svc.create(crew, {
        id: R1,
        name: "Lounge",
        category: "leisure",
        minTier: "Silver",
      });

      const events = sink.list();
      expect(events).toHaveLength(1);
      expect(events[0]?.action).toBe("ResourceCreated");
      expect(events[0]?.targetKind).toBe("Resource");
      expect(events[0]?.targetId).toBe(R1);
    });

    it("AU-S5: ResourceMinTierChanged records new tier in details", () => {
      const svc = new ResourceService(clock, audit);
      svc.create(crew, {
        id: R1,
        name: "Lounge",
        category: "leisure",
        minTier: "Silver",
      });
      svc.changeMinTier(crew, R1, "Platinum");

      const events = sink.list();
      expect(events).toHaveLength(2);
      expect(events[1]?.action).toBe("ResourceMinTierChanged");
      expect(events[1]?.details?.newMinTier).toBe("Platinum");
    });

    it("AU-S6: ResourceDeleted on successful softDelete", () => {
      const svc = new ResourceService(clock, audit);
      svc.create(crew, {
        id: R1,
        name: "Lounge",
        category: "leisure",
        minTier: "Silver",
      });
      svc.softDelete(crew, R1);

      const events = sink.list();
      expect(events).toHaveLength(2);
      expect(events[1]?.action).toBe("ResourceDeleted");
    });
  });

  describe("crew lead mutations (AU-S7, AU-S8)", () => {
    it("AU-S7: bootstrap emits CrewLeadBootstrapped", () => {
      const svc = new CrewLeadService(audit);
      svc.bootstrap(threeLeads);

      const events = sink.list();
      expect(events).toHaveLength(1);
      expect(events[0]?.action).toBe("CrewLeadBootstrapped");
      expect(events[0]?.targetKind).toBe("CrewLead");
    });

    it("AU-S8: replace emits CrewLeadReplaced referencing the new lead", () => {
      const svc = new CrewLeadService(audit);
      svc.bootstrap(threeLeads);
      const newLead: CrewLead = { id: CL4, name: "Dave" };
      svc.replace(CL2, newLead, CL1);

      const events = sink.list();
      const replaced = events.find((e) => e.action === "CrewLeadReplaced");
      expect(replaced).toBeDefined();
      expect(replaced?.targetId).toBe(CL4);
      expect(replaced?.actorId).toBe(CL1);
      expect(replaced?.details?.replacedId).toBe(CL2);
    });

    it("add with actor emits CrewLeadAdded", () => {
      const svc = new CrewLeadService(audit);
      svc.add({ id: CL1, name: "Alice" }, CL1);

      const events = sink.list();
      expect(events).toHaveLength(1);
      expect(events[0]?.action).toBe("CrewLeadAdded");
      expect(events[0]?.targetId).toBe(CL1);
    });
  });

  describe("silence on failure (AU-S9, AU-S10)", () => {
    it("AU-S9: no event when a non-Crew-Lead tries to create a passenger", () => {
      const svc = new PassengerService(clock, audit);
      svc.create(passenger, { id: P1, name: "Ada", tier: "Silver" });

      expect(sink.list()).toHaveLength(0);
    });

    it("AU-S10: no event when changeTier targets an unknown passenger", () => {
      const svc = new PassengerService(clock, audit);
      svc.changeTier(crew, P1, "Gold");

      expect(sink.list()).toHaveLength(0);
    });
  });

  describe("ordering (AU-I2)", () => {
    it("AU-S11: events appear in mutation order", () => {
      const svc = new PassengerService(clock, audit);
      svc.create(crew, { id: P1, name: "Ada", tier: "Silver" });
      svc.changeTier(crew, P1, "Gold");
      svc.softDelete(crew, P1);

      const actions = sink.list().map((e) => e.action);
      expect(actions).toEqual([
        "PassengerCreated",
        "PassengerTierChanged",
        "PassengerDeleted",
      ]);
    });
  });

  describe("timestamps (AU-R5)", () => {
    it("event timestamps come from the injected clock", () => {
      const svc = new PassengerService(clock, audit);
      clock.set(new Date("2026-03-03T10:00:00.000Z"));
      svc.create(crew, { id: P1, name: "Ada", tier: "Silver" });

      expect(sink.list()[0]?.timestamp).toBe("2026-03-03T10:00:00.000Z");
    });
  });
});
