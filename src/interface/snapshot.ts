/**
 * Snapshot exporter — runs the app composition in memory with the
 * scripted seed and writes `{ passengers, resources }` to
 * `web/public/snapshot.json`.
 *
 * Consumed by the static web UI at build time (see specs/10-web.md,
 * WB-R1). Keep this file boring: no domain logic beyond reusing the
 * same crew leads / passengers / resources the demo already seeds.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Actor } from "../domain/actor.js";
import { toCrewLeadId, type CrewLead } from "../domain/crew-lead.js";
import { toPassengerId } from "../domain/passenger.js";
import { toResourceId } from "../domain/resource.js";
import { buildApp } from "./composition-root.js";

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

app.passengers.create(crew, {
  id: toPassengerId("P1"),
  name: "Ada",
  tier: "Silver",
});
app.passengers.create(crew, {
  id: toPassengerId("P2"),
  name: "Bea",
  tier: "Gold",
});
app.passengers.create(crew, {
  id: toPassengerId("P3"),
  name: "Cai",
  tier: "Platinum",
});

app.resources.create(crew, {
  id: toResourceId("R-food"),
  name: "Food Station",
  category: "essentials",
  minTier: "Silver",
});
app.resources.create(crew, {
  id: toResourceId("R-pod"),
  name: "Sleeping Pod",
  category: "essentials",
  minTier: "Silver",
});
app.resources.create(crew, {
  id: toResourceId("R-cabin"),
  name: "Private Cabin",
  category: "comfort",
  minTier: "Gold",
});
app.resources.create(crew, {
  id: toResourceId("R-med"),
  name: "Advanced Medical Bay",
  category: "health",
  minTier: "Gold",
});
app.resources.create(crew, {
  id: toResourceId("R-o2"),
  name: "Luxury O2 Pod",
  category: "luxury",
  minTier: "Platinum",
});
app.resources.create(crew, {
  id: toResourceId("R-vip"),
  name: "VIP Rec Deck",
  category: "luxury",
  minTier: "Platinum",
});

const outPath = resolve(
  process.cwd(),
  process.argv[2] ?? "web/public/snapshot.json",
);
const payload = {
  passengers: app.passengers.list(),
  resources: app.resources.list(),
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
process.stdout.write(`snapshot written to ${outPath}\n`);
