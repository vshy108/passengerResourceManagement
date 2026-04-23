import type { Actor } from "../domain/actor.js";
import { toCrewLeadId, type CrewLead } from "../domain/crew-lead.js";
import { toPassengerId } from "../domain/passenger.js";
import { toResourceId } from "../domain/resource.js";
import { buildApp } from "./composition-root.js";

/**
 * Minimal end-to-end demonstration.
 *
 * Bootstraps the three Crew Leads, registers two passengers and three
 * resources, exercises allowed and denied access attempts (with a
 * tier upgrade in the middle), then renders a human-readable summary.
 *
 * Pure function by design — builds a fresh app, returns a string, and
 * performs no I/O. The CLI entry (`./cli.ts`) writes the string to
 * stdout; the integration test asserts on the returned value directly.
 */
export function runDemo(): string {
  const app = buildApp();

  const CL1 = toCrewLeadId("CL1");
  const CL2 = toCrewLeadId("CL2");
  const CL3 = toCrewLeadId("CL3");
  const leads: CrewLead[] = [
    { id: CL1, name: "Alice" },
    { id: CL2, name: "Bob" },
    { id: CL3, name: "Carol" },
  ];
  app.crewLeads.bootstrap(leads);

  const crew: Actor = { kind: "CrewLead", id: CL1 };

  const P1 = toPassengerId("P1");
  const P2 = toPassengerId("P2");
  app.passengers.create(crew, { id: P1, name: "Ada", tier: "Silver" });
  app.passengers.create(crew, { id: P2, name: "Bea", tier: "Platinum" });

  const RLounge = toResourceId("R-lounge");
  const RSpa = toResourceId("R-spa");
  const RObs = toResourceId("R-obs");
  app.resources.create(crew, {
    id: RLounge,
    name: "Lounge",
    category: "leisure",
    minTier: "Silver",
  });
  app.resources.create(crew, {
    id: RSpa,
    name: "Spa",
    category: "leisure",
    minTier: "Gold",
  });
  app.resources.create(crew, {
    id: RObs,
    name: "Observation Deck",
    category: "leisure",
    minTier: "Platinum",
  });

  const ada: Actor = { kind: "Passenger", id: P1 };
  const bea: Actor = { kind: "Passenger", id: P2 };

  // Ada (Silver) tries everything: one allowed, two denied.
  app.access.useResource(ada, RLounge); // allowed
  app.access.useResource(ada, RSpa); // denied
  app.access.useResource(ada, RObs); // denied

  // Upgrade Ada, try again.
  app.passengers.changeTier(crew, P1, "Gold");
  app.access.useResource(ada, RSpa); // allowed

  // Bea (Platinum) roams freely.
  app.access.useResource(bea, RLounge);
  app.access.useResource(bea, RSpa);
  app.access.useResource(bea, RObs);

  const lines: string[] = [];
  lines.push("=== Crew Leads ===");
  for (const l of app.crewLeads.list()) lines.push(`  ${l.id} ${l.name}`);

  lines.push("=== Passengers ===");
  for (const p of app.passengers.list()) {
    lines.push(`  ${p.id} ${p.name} (${p.tier})`);
  }

  lines.push("=== Resources ===");
  for (const r of app.resources.list()) {
    lines.push(`  ${r.id} ${r.name} minTier=${r.minTier}`);
  }

  lines.push("=== Ada's history ===");
  for (const e of app.reporting.personalHistory(P1)) {
    lines.push(`  ${e.resourceId} ${e.outcome} @${e.tierAtAttempt}`);
  }

  lines.push("=== Aggregate by tier ===");
  const agg = app.reporting.aggregateByTier();
  for (const [tier, counts] of Object.entries(agg)) {
    lines.push(
      `  ${tier}: allowed=${String(counts.allowed)} denied=${String(counts.denied)}`,
    );
  }

  lines.push("=== Top 3 resources (by allowed uses) ===");
  for (const id of app.reporting.topResources(3)) lines.push(`  ${id}`);

  lines.push(`=== Admin events: ${String(app.adminEvents.list().length)} ===`);
  lines.push(`=== Usage events: ${String(app.usageEvents.list().length)} ===`);

  return lines.join("\n");
}
