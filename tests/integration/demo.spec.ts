/**
 * Integration test for the scripted CLI demo.
 *
 * Exercises the full composition root end-to-end and asserts on the
 * rendered output so the demo never silently regresses.
 */
import { describe, it, expect } from "vitest";
import { runDemo } from "../../src/interface/demo.js";

describe("demo CLI (integration)", () => {
  it("runs end-to-end without throwing and reports expected sections", () => {
    const out = runDemo();
    expect(out).toContain("Crew Leads");
    expect(out).toContain("Passengers");
    expect(out).toContain("Resources");
    expect(out).toContain("Ada's history");
    expect(out).toContain("Aggregate by tier");
    expect(out).toContain("Top 3 resources");
    // Ada had 4 attempts, Bea had 3 attempts -> 7 usage events.
    expect(out).toContain("Usage events: 7");
  });
});
