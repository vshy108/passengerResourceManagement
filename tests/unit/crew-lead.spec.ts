/** Crew Lead rules (CL-R1..R4, CL-I1). See specs/02-crew-lead.md. */
import { describe, it, expect, beforeEach } from "vitest";
import { CrewLeadService } from "../../src/application/crew-lead.service.js";
import { toCrewLeadId, type CrewLead } from "../../src/domain/crew-lead.js";

/**
 * Tests derived from specs/02-crew-lead.md
 */
const mk = (id: string, name: string): CrewLead => ({
  id: toCrewLeadId(id),
  name,
});

describe("Crew Lead Service", () => {
  let svc: CrewLeadService;
  const A = mk("A", "Ava");
  const B = mk("B", "Bo");
  const C = mk("C", "Ci");
  const D = mk("D", "Dex");

  beforeEach(() => {
    svc = new CrewLeadService();
  });

  describe("bootstrap (CL-R1, CL-I1)", () => {
    it("CL-S1: bootstrap with 3 distinct leads succeeds", () => {
      const result = svc.bootstrap([A, B, C]);
      expect(result.ok).toBe(true);
      expect(svc.list()).toEqual([A, B, C]);
    });

    it("CL-S2: bootstrap with 2 leads is rejected", () => {
      const result = svc.bootstrap([A, B]);
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.error.kind).toBe("CrewLeadBootstrapInvalid");
    });

    it("CL-S3: bootstrap with 4 leads is rejected", () => {
      const result = svc.bootstrap([A, B, C, D]);
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.error.kind).toBe("CrewLeadBootstrapInvalid");
    });

    it("CL-S4: bootstrap with duplicate ids is rejected", () => {
      const result = svc.bootstrap([A, A, C]);
      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.error.kind).toBe("CrewLeadBootstrapInvalid");
    });
  });

  describe("add (CL-R2)", () => {
    it("CL-S5: adding a 4th lead returns CrewLeadLimitReached", () => {
      svc.bootstrap([A, B, C]);
      const result = svc.add(D);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("CrewLeadLimitReached");
      expect(svc.list()).toHaveLength(3);
    });
  });

  describe("remove (CL-R3)", () => {
    it("CL-S6: removing when count is 3 returns CrewLeadMinimumBreached", () => {
      svc.bootstrap([A, B, C]);
      const result = svc.remove(A.id);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("CrewLeadMinimumBreached");
      expect(svc.list()).toHaveLength(3);
    });
  });

  describe("replace (CL-R4)", () => {
    it("CL-S7: replace swaps the old lead for the new, count stays 3", () => {
      svc.bootstrap([A, B, C]);
      const result = svc.replace(A.id, D);
      expect(result.ok).toBe(true);
      expect(svc.list()).toEqual([D, B, C]);
    });

    it("CL-S8: replacing an unknown id returns CrewLeadNotFound", () => {
      svc.bootstrap([A, B, C]);
      const result = svc.replace(toCrewLeadId("ZZ"), D);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("CrewLeadNotFound");
      expect(svc.list()).toEqual([A, B, C]);
    });

    it("CL-S9: replacing with an id that already belongs to another lead is rejected", () => {
      svc.bootstrap([A, B, C]);
      const result = svc.replace(A.id, mk("B", "B2"));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.kind).toBe("CrewLeadAlreadyExists");
      expect(svc.list()).toEqual([A, B, C]);
    });
  });

  describe("list (CL-R6)", () => {
    it("CL-S11: list returns leads in insertion order", () => {
      svc.bootstrap([A, B, C]);
      expect(svc.list()).toEqual([A, B, C]);
    });

    it("isBootstrapped reflects bootstrap state", () => {
      expect(svc.isBootstrapped()).toBe(false);
      svc.bootstrap([A, B, C]);
      expect(svc.isBootstrapped()).toBe(true);
    });
  });

  describe("add (happy path via pre-bootstrap)", () => {
    it("add succeeds when count < 3 and rejects duplicate ids", () => {
      expect(svc.add(A).ok).toBe(true);
      expect(svc.add(A).ok).toBe(false); // duplicate id
      expect(svc.add(B).ok).toBe(true);
      expect(svc.add(C).ok).toBe(true);
      // now at 3 → 4th is rejected
      expect(svc.add(D).ok).toBe(false);
      expect(svc.list()).toEqual([A, B, C]);
    });
  });
});
