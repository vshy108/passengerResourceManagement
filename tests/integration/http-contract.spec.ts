import { describe, expect, it } from "vitest";
import { buildApp } from "../../src/interface/composition-root.js";
import { httpContract } from "../../src/interface/http/contract.js";
import { createHttpApp } from "../../src/interface/http/server.js";

const mutatingMethods = new Set(["PATCH", "POST"]);

describe("HTTP contract snapshot", () => {
  it("detects route registration drift", async () => {
    const app = createHttpApp(buildApp());
    await app.ready();

    for (const route of httpContract) {
      expect(
        app.hasRoute({ method: route.method, url: route.path }),
        `${route.method} ${route.path}`,
      ).toBe(true);
    }
  });

  it("documents body, actor, and status expectations for mutable routes", () => {
    const mutableRoutes = httpContract.filter((route) =>
      mutatingMethods.has(route.method),
    );

    expect(mutableRoutes).not.toHaveLength(0);
    for (const route of mutableRoutes) {
      expect(route.requestBody.length, `${route.method} ${route.path}`).toBeGreaterThan(0);
      expect(route.actorHeader).not.toBe("optional");
      expect(route.successStatus).toBeGreaterThanOrEqual(200);
      expect(route.successStatus).toBeLessThan(300);
      expect(route.errorStatuses.every((status) => status >= 400)).toBe(true);
    }
  });
});
