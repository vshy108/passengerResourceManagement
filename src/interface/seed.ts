import type { Actor } from "../domain/actor.js";
import { toCrewLeadId, type CrewLead } from "../domain/crew-lead.js";
import { toPassengerId } from "../domain/passenger.js";
import { toResourceId } from "../domain/resource.js";
import type { AppContext } from "./composition-root.js";

/**
 * Canonical demo world drawn from the requirements glossary
 * (specs/00-glossary.md): three Crew Leads, three Passengers spanning
 * every tier, and the six example onboard facilities. See
 * specs/12-demo-seed.md (`DS`).
 *
 * Idempotent — every insert is gated on a `list()` check, so the seed
 * can be applied to a fresh store or replayed safely.
 *
 * Returns `true` when at least one entity was created, `false` when
 * the world was already complete.
 */
export function seedDemoWorld(app: AppContext): boolean {
  let mutated = false;

  const CL1 = toCrewLeadId("CL1");
  const leads: readonly CrewLead[] = [
    { id: CL1, name: "Alice" },
    { id: toCrewLeadId("CL2"), name: "Bob" },
    { id: toCrewLeadId("CL3"), name: "Carol" },
  ];
  if (app.crewLeads.list().length === 0) {
    app.crewLeads.bootstrap(leads);
    mutated = true;
  }

  const crew: Actor = { kind: "CrewLead", id: CL1 };

  const passengerSeeds = [
    { id: toPassengerId("P1"), name: "Ada", tier: "Silver" as const },
    { id: toPassengerId("P2"), name: "Bea", tier: "Gold" as const },
    { id: toPassengerId("P3"), name: "Cai", tier: "Platinum" as const },
  ];
  const existingPassengers = new Set(app.passengers.list().map((p) => p.id));
  for (const seed of passengerSeeds) {
    if (!existingPassengers.has(seed.id)) {
      app.passengers.create(crew, seed);
      mutated = true;
    }
  }

  const resourceSeeds = [
    { id: toResourceId("R-food"),  name: "Food Station",  category: "nutrition", minTier: "Silver"   as const },
    { id: toResourceId("R-pod"),   name: "Sleeping Pod",  category: "rest",      minTier: "Silver"   as const },
    { id: toResourceId("R-cabin"), name: "Cabin Suite",   category: "rest",      minTier: "Gold"     as const },
    { id: toResourceId("R-med"),   name: "Med Bay",       category: "health",    minTier: "Gold"     as const },
    { id: toResourceId("R-o2"),    name: "Luxury O2 Pod", category: "oxygen",    minTier: "Platinum" as const },
    { id: toResourceId("R-vip"),   name: "VIP Lounge",    category: "leisure",   minTier: "Platinum" as const },
  ];
  const existingResources = new Set(app.resources.list().map((r) => r.id));
  for (const seed of resourceSeeds) {
    if (!existingResources.has(seed.id)) {
      app.resources.create(crew, seed);
      mutated = true;
    }
  }

  return mutated;
}
