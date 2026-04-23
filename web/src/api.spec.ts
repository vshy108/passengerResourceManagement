/**
 * Unit tests for the API client (specs/11-web-interactive.md, WI-R1..R2).
 * `fetch` is stubbed so no real network is ever touched.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  bootstrapCrewLeads,
  createPassenger,
  listPassengers,
  listResources,
  useResource,
} from "./api";
import type { Actor } from "./types";

type FetchArgs = [input: string, init?: RequestInit];

function stubFetch(
  impl: (url: string, init?: RequestInit) => Promise<Response>,
): ReturnType<typeof vi.fn> {
  const spy = vi.fn<(...args: FetchArgs) => Promise<Response>>(impl);
  vi.stubGlobal("fetch", spy);
  return spy;
}

const ok = (body: unknown, status = 200): Promise<Response> =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );

const fail = (status: number, error: unknown): Promise<Response> =>
  Promise.resolve(
    new Response(JSON.stringify({ error }), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );

const crewLead: Actor = { kind: "CrewLead", id: "CL1", name: "Alice" };

describe("api client", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("WI-R1: GET list returns parsed JSON", async () => {
    stubFetch(() => ok([{ id: "P1", name: "Ada", tier: "Silver" }]));
    const list = await listPassengers();
    expect(list).toEqual([{ id: "P1", name: "Ada", tier: "Silver" }]);
  });

  it("WI-R1: non-2xx with DomainError body rejects with ApiError", async () => {
    stubFetch(() => fail(403, { kind: "AccessDenied" }));
    await expect(useResource(crewLead, "R1")).rejects.toBeInstanceOf(ApiError);
    try {
      await useResource(crewLead, "R1");
    } catch (e) {
      const err = e as ApiError;
      expect(err.status).toBe(403);
      expect(err.error.kind).toBe("AccessDenied");
    }
  });

  it("WI-R1: non-2xx with non-JSON body falls back to Http error", async () => {
    stubFetch(() => Promise.resolve(new Response("boom", { status: 500 })));
    // "boom" is not JSON so parsing throws; surface as a rejected promise.
    await expect(listPassengers()).rejects.toBeInstanceOf(SyntaxError);
  });

  it("WI-R2: mutating calls attach x-actor header", async () => {
    const spy = stubFetch(() =>
      ok({ id: "P1", name: "Ada", tier: "Silver" }, 201),
    );
    await createPassenger(crewLead, {
      id: "P1",
      name: "Ada",
      tier: "Silver",
    });

    const [, init] = spy.mock.calls[0] ?? [];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers["x-actor"]).toBe("CrewLead:CL1");
    expect(headers["content-type"]).toBe("application/json");
    expect(init?.method).toBe("POST");
  });

  it("WI-R2: read calls do not attach x-actor", async () => {
    const spy = stubFetch(() => ok([]));
    await listResources("Gold");
    const [url, init] = spy.mock.calls[0] ?? [];
    expect(url).toBe("/api/resources?tier=Gold");
    const headers = (init?.headers ?? {}) as Record<string, string>;
    expect(headers["x-actor"]).toBeUndefined();
  });

  it("bootstrapCrewLeads posts the leads array", async () => {
    const spy = stubFetch(() =>
      ok(
        [
          { id: "CL1", name: "A" },
          { id: "CL2", name: "B" },
          { id: "CL3", name: "C" },
        ],
        201,
      ),
    );
    await bootstrapCrewLeads([
      { id: "CL1", name: "A" },
      { id: "CL2", name: "B" },
      { id: "CL3", name: "C" },
    ]);
    const [url, init] = spy.mock.calls[0] ?? [];
    expect(url).toBe("/api/crew-leads/bootstrap");
    expect(JSON.parse(String(init?.body ?? ""))).toEqual({
      leads: [
        { id: "CL1", name: "A" },
        { id: "CL2", name: "B" },
        { id: "CL3", name: "C" },
      ],
    });
  });
});
