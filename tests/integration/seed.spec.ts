/**
 * Integration tests for the demo seed (specs/12-demo-seed.md, DS-R1..R3,
 * DS-S1..S3). Uses an in-memory composition root and Fastify's
 * `inject()` so the server `--seed` scenario stays hermetic.
 */
import { describe, expect, it } from "vitest";
import { FakeClock } from "../../src/infrastructure/clock.js";
import { buildApp } from "../../src/interface/composition-root.js";
import { createHttpApp } from "../../src/interface/http/server.js";
import { seedDemoWorld } from "../../src/interface/seed.js";

const jsonOf = <T = unknown>(res: { json: () => unknown }): T =>
  res.json() as T;

function fresh() {
  let n = 0;
  const clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"));
  return buildApp({ clock, idGen: () => `id-${String(++n)}` });
}

describe("Demo seed (specs/12-demo-seed.md)", () => {
  it("DS-S1: empty world -> fully populated", () => {
    const ctx = fresh();
    const mutated = seedDemoWorld(ctx);
    expect(mutated).toBe(true);
    expect(ctx.crewLeads.list()).toHaveLength(3);
    expect(ctx.passengers.list()).toHaveLength(3);
    expect(ctx.resources.list()).toHaveLength(6);
  });

  it("DS-S2: replay is a no-op", () => {
    const ctx = fresh();
    seedDemoWorld(ctx);
    const adminCountAfterFirst = ctx.adminEvents.list().length;
    const mutated = seedDemoWorld(ctx);
    expect(mutated).toBe(false);
    expect(ctx.crewLeads.list()).toHaveLength(3);
    expect(ctx.passengers.list()).toHaveLength(3);
    expect(ctx.resources.list()).toHaveLength(6);
    expect(ctx.adminEvents.list().length).toBe(adminCountAfterFirst);
  });

  it("DS-S3: server --seed exposes seeded world over HTTP", async () => {
    const ctx = fresh();
    seedDemoWorld(ctx);
    const app = createHttpApp(ctx);

    const passengers = await app.inject({ method: "GET", url: "/passengers" });
    expect(passengers.statusCode).toBe(200);
    expect(jsonOf<unknown[]>(passengers)).toHaveLength(3);

    const silver = await app.inject({
      method: "GET",
      url: "/resources?tier=Silver",
    });
    expect(silver.statusCode).toBe(200);
    const silverIds = jsonOf<Array<{ id: string }>>(silver)
      .map((r) => r.id)
      .slice()
      .sort();
    expect(silverIds).toEqual(["R-food", "R-pod"]);
  });
});
