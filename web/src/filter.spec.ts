import { describe, expect, it } from "vitest";
import { filterByTier } from "./filter";
import type { Resource } from "./types";

const resources: Resource[] = [
  { id: "R-food", name: "Food", category: "ess", minTier: "Silver" },
  { id: "R-cabin", name: "Cabin", category: "comfort", minTier: "Gold" },
  { id: "R-vip", name: "VIP Deck", category: "luxury", minTier: "Platinum" },
];

describe("filterByTier (specs/10-web.md, WB-R3)", () => {
  it("WB-S1: Silver sees only Silver-min resources", () => {
    expect(filterByTier(resources, "Silver").map((r) => r.id)).toEqual([
      "R-food",
    ]);
  });

  it("Gold sees Silver + Gold", () => {
    expect(filterByTier(resources, "Gold").map((r) => r.id)).toEqual([
      "R-food",
      "R-cabin",
    ]);
  });

  it("WB-S2: Platinum sees everything (inheritance)", () => {
    expect(filterByTier(resources, "Platinum").map((r) => r.id)).toEqual([
      "R-food",
      "R-cabin",
      "R-vip",
    ]);
  });
});
