/**
 * Integration tests for the REST API (specs/09-http.md, HT-R1..R6,
 * HT-S1..S6). Uses Fastify's in-process `inject()` \u2014 no real sockets,
 * no real clock, no real filesystem.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { FakeClock } from "../../src/infrastructure/clock.js";
import { buildApp } from "../../src/interface/composition-root.js";
import { createHttpApp } from "../../src/interface/http/server.js";

// Typed shim around Fastify's `any`-typed `.json()` helper so the test
// file stays lint-clean under no-unsafe-member-access.
const jsonOf = <T = unknown>(res: { json: () => unknown }): T =>
  res.json() as T;

function seedApp() {
  let n = 0;
  const clock = new FakeClock(new Date("2026-01-01T00:00:00.000Z"));
  const ctx = buildApp({
    clock,
    idGen: () => `id-${String(++n)}`,
  });
  return { ctx, app: createHttpApp(ctx) };
}

describe("HTTP API (specs/09-http.md)", () => {
  let app: ReturnType<typeof seedApp>["app"];
  let ctx: ReturnType<typeof seedApp>["ctx"];

  beforeEach(() => {
    ({ app, ctx } = seedApp());
  });

  it("HT-S1: GET /health \u2192 200", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });

  it("HT-S5: bootstrap with != 3 leads \u2192 409", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/crew-leads/bootstrap",
      payload: {
        leads: [
          { id: "CL1", name: "A" },
          { id: "CL2", name: "B" },
        ],
      },
    });
    expect(res.statusCode).toBe(409);
    expect(jsonOf<{ error: { kind: string } }>(res).error.kind).toBe(
      "CrewLeadBootstrapInvalid",
    );
  });

  it("HT-R4: successful bootstrap \u2192 201 + list", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/crew-leads/bootstrap",
      payload: {
        leads: [
          { id: "CL1", name: "A" },
          { id: "CL2", name: "B" },
          { id: "CL3", name: "C" },
        ],
      },
    });
    expect(res.statusCode).toBe(201);

    const list = await app.inject({ method: "GET", url: "/crew-leads" });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(3);
  });

  describe("after bootstrap", () => {
    beforeEach(async () => {
      await app.inject({
        method: "POST",
        url: "/crew-leads/bootstrap",
        payload: {
          leads: [
            { id: "CL1", name: "A" },
            { id: "CL2", name: "B" },
            { id: "CL3", name: "C" },
          ],
        },
      });
    });

    it("HT-S6: missing x-actor \u2192 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/passengers",
        payload: { id: "P1", name: "Ada", tier: "Silver" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("HT-S2: non-CrewLead actor on /passengers \u2192 403", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/passengers",
        headers: { "x-actor": "Passenger:P1" },
        payload: { id: "P1", name: "Ada", tier: "Silver" },
      });
      expect(res.statusCode).toBe(403);
      expect(jsonOf<{ error: { kind: string } }>(res).error.kind).toBe(
        "UnauthorizedActor",
      );
    });

    it("HT-S3: unknown tier \u2192 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/passengers",
        headers: { "x-actor": "CrewLead:CL1" },
        payload: { id: "P1", name: "Ada", tier: "Titanium" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("create passenger + resource, list, and filter by tier", async () => {
      await app.inject({
        method: "POST",
        url: "/passengers",
        headers: { "x-actor": "CrewLead:CL1" },
        payload: { id: "P1", name: "Ada", tier: "Silver" },
      });
      await app.inject({
        method: "POST",
        url: "/resources",
        headers: { "x-actor": "CrewLead:CL1" },
        payload: {
          id: "R-spa",
          name: "Spa",
          category: "leisure",
          minTier: "Gold",
        },
      });
      await app.inject({
        method: "POST",
        url: "/resources",
        headers: { "x-actor": "CrewLead:CL1" },
        payload: {
          id: "R-lounge",
          name: "Lounge",
          category: "leisure",
          minTier: "Silver",
        },
      });

      const all = await app.inject({ method: "GET", url: "/resources" });
      expect(all.json()).toHaveLength(2);

      const forSilver = await app.inject({
        method: "GET",
        url: "/resources?tier=Silver",
      });
      const ids = jsonOf<{ id: string }[]>(forSilver).map((r) => r.id);
      expect(ids).toEqual(["R-lounge"]);
    });

    it("HT-S4: denied access returns 403 but records a usage event", async () => {
      await app.inject({
        method: "POST",
        url: "/passengers",
        headers: { "x-actor": "CrewLead:CL1" },
        payload: { id: "P1", name: "Ada", tier: "Silver" },
      });
      await app.inject({
        method: "POST",
        url: "/resources",
        headers: { "x-actor": "CrewLead:CL1" },
        payload: {
          id: "R-spa",
          name: "Spa",
          category: "leisure",
          minTier: "Gold",
        },
      });

      const res = await app.inject({
        method: "POST",
        url: "/access/use",
        headers: { "x-actor": "Passenger:P1" },
        payload: { resourceId: "R-spa" },
      });
      expect(res.statusCode).toBe(403);
      expect(jsonOf<{ error: { kind: string } }>(res).error.kind).toBe(
        "AccessDenied",
      );
      expect(ctx.usageEvents.list()).toHaveLength(1);
      expect(ctx.usageEvents.list()[0]!.outcome).toBe("DENIED");
    });

    it("tier change + allowed access + reports round-trip", async () => {
      await app.inject({
        method: "POST",
        url: "/passengers",
        headers: { "x-actor": "CrewLead:CL1" },
        payload: { id: "P1", name: "Ada", tier: "Silver" },
      });
      await app.inject({
        method: "POST",
        url: "/resources",
        headers: { "x-actor": "CrewLead:CL1" },
        payload: {
          id: "R-lounge",
          name: "Lounge",
          category: "leisure",
          minTier: "Silver",
        },
      });

      const allowed = await app.inject({
        method: "POST",
        url: "/access/use",
        headers: { "x-actor": "Passenger:P1" },
        payload: { resourceId: "R-lounge" },
      });
      expect(allowed.statusCode).toBe(201);

      const patch = await app.inject({
        method: "PATCH",
        url: "/passengers/P1/tier",
        headers: { "x-actor": "CrewLead:CL1" },
        payload: { tier: "Gold" },
      });
      expect(patch.statusCode).toBe(200);

      const del = await app.inject({
        method: "DELETE",
        url: "/passengers/P1",
        headers: { "x-actor": "CrewLead:CL1" },
      });
      expect(del.statusCode).toBe(200);

      const history = await app.inject({
        method: "GET",
        url: "/reports/history/P1",
      });
      expect(history.json()).toHaveLength(1);

      const agg = await app.inject({
        method: "GET",
        url: "/reports/aggregate-by-tier",
      });
      expect(jsonOf<{ Silver: { allowed: number } }>(agg).Silver.allowed).toBe(
        1,
      );

      const top = await app.inject({
        method: "GET",
        url: "/reports/top-resources?n=1",
      });
      expect(top.json()).toEqual(["R-lounge"]);
    });

    it("GET /passengers/:id returns 404 for unknown id", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/passengers/NOPE",
      });
      expect(res.statusCode).toBe(404);
    });

    it("GET /passengers returns active passengers only", async () => {
      const res = await app.inject({ method: "GET", url: "/passengers" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });

    it("malformed body \u2192 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/passengers",
        headers: { "x-actor": "CrewLead:CL1" },
        payload: { id: 42 },
      });
      expect(res.statusCode).toBe(400);
    });

    it("malformed bootstrap body \u2192 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/crew-leads/bootstrap",
        payload: { nope: true },
      });
      expect(res.statusCode).toBe(400);
    });

    it("malformed lead entry in bootstrap \u2192 400", async () => {
      const fresh = seedApp();
      const res = await fresh.app.inject({
        method: "POST",
        url: "/crew-leads/bootstrap",
        payload: { leads: [{ id: 1 }] },
      });
      expect(res.statusCode).toBe(400);
    });

    it("malformed tier-change body \u2192 400", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: "/passengers/P1/tier",
        headers: { "x-actor": "CrewLead:CL1" },
        payload: { tier: "Titanium" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("malformed resource body \u2192 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/resources",
        headers: { "x-actor": "CrewLead:CL1" },
        payload: { id: "R1" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("malformed access body \u2192 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/access/use",
        headers: { "x-actor": "Passenger:P1" },
        payload: {},
      });
      expect(res.statusCode).toBe(400);
    });

    it("missing x-actor on tier change \u2192 400", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: "/passengers/P1/tier",
        payload: { tier: "Gold" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("missing x-actor on delete \u2192 400", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: "/passengers/P1",
      });
      expect(res.statusCode).toBe(400);
    });

    it("missing x-actor on resource create \u2192 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/resources",
        payload: {
          id: "R1",
          name: "X",
          category: "c",
          minTier: "Silver",
        },
      });
      expect(res.statusCode).toBe(400);
    });

    it("missing x-actor on access \u2192 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/access/use",
        payload: { resourceId: "R1" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("malformed x-actor header \u2192 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/passengers",
        headers: { "x-actor": "nonsense" },
        payload: { id: "P2", name: "Bea", tier: "Gold" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("x-actor with unknown kind \u2192 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/passengers",
        headers: { "x-actor": "Admin:X" },
        payload: { id: "P2", name: "Bea", tier: "Gold" },
      });
      expect(res.statusCode).toBe(400);
    });

    it("GET /resources without tier returns full list", async () => {
      const res = await app.inject({ method: "GET", url: "/resources" });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });

    it("GET /resources with unknown tier falls back to full list", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/resources?tier=Bronze",
      });
      expect(res.statusCode).toBe(200);
    });

    it("GET /reports/top-resources defaults n=3", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/reports/top-resources",
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });

    it("GET /reports/top-resources ignores non-numeric n", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/reports/top-resources?n=abc",
      });
      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });
  });
});
