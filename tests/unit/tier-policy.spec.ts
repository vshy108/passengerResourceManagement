/** Tier policy rules (TP-R1..R2). See specs/01-tier-policy.md. */
import { describe, it, expect } from "vitest";
import { canAccess, rank } from "../../src/domain/tier.js";

/**
 * Tests derived from specs/01-tier-policy.md
 * Test names follow scenario IDs (TP-Sn).
 */
describe("Tier Policy", () => {
  describe("rank (TP-R1)", () => {
    it("TP-S10: rank(Silver) === 1", () => {
      expect(rank("Silver")).toBe(1);
    });

    it("TP-S11: rank(Gold) === 2", () => {
      expect(rank("Gold")).toBe(2);
    });

    it("TP-S12: rank(Platinum) === 3", () => {
      expect(rank("Platinum")).toBe(3);
    });
  });

  describe("canAccess (TP-R2)", () => {
    it("TP-S1: Silver passenger -> Silver resource = true", () => {
      expect(canAccess("Silver", "Silver")).toBe(true);
    });

    it("TP-S2: Silver passenger -> Gold resource = false", () => {
      expect(canAccess("Silver", "Gold")).toBe(false);
    });

    it("TP-S3: Silver passenger -> Platinum resource = false", () => {
      expect(canAccess("Silver", "Platinum")).toBe(false);
    });

    it("TP-S4: Gold passenger -> Silver resource = true", () => {
      expect(canAccess("Gold", "Silver")).toBe(true);
    });

    it("TP-S5: Gold passenger -> Gold resource = true", () => {
      expect(canAccess("Gold", "Gold")).toBe(true);
    });

    it("TP-S6: Gold passenger -> Platinum resource = false", () => {
      expect(canAccess("Gold", "Platinum")).toBe(false);
    });

    it("TP-S7: Platinum passenger -> Silver resource = true", () => {
      expect(canAccess("Platinum", "Silver")).toBe(true);
    });

    it("TP-S8: Platinum passenger -> Gold resource = true", () => {
      expect(canAccess("Platinum", "Gold")).toBe(true);
    });

    it("TP-S9: Platinum passenger -> Platinum resource = true", () => {
      expect(canAccess("Platinum", "Platinum")).toBe(true);
    });
  });
});
