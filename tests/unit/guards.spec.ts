/** Unit tests for the `requireCrewLead` authorisation guard. */
import { describe, expect, it } from "vitest";
import { requireCrewLead } from "../../src/application/guards.js";
import type { Actor } from "../../src/domain/actor.js";
import { toCrewLeadId } from "../../src/domain/crew-lead.js";
import { toPassengerId } from "../../src/domain/passenger.js";

describe("requireCrewLead guard", () => {
  it("returns ok with the crew-lead id when actor is a CrewLead", () => {
    const id = toCrewLeadId("CL1");
    const actor: Actor = { kind: "CrewLead", id };
    const result = requireCrewLead(actor);
    expect(result).toEqual({ ok: true, value: id });
  });

  it("returns UnauthorizedActor error when actor is a Passenger", () => {
    const actor: Actor = { kind: "Passenger", id: toPassengerId("P1") };
    const result = requireCrewLead(actor);
    expect(result).toEqual({
      ok: false,
      error: { kind: "UnauthorizedActor", required: "CrewLead" },
    });
  });
});
