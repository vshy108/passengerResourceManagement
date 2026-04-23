/**
 * Typed HTTP client for the Fastify REST API (specs/09-http.md).
 *
 * The single I/O boundary for the UI (WI-R1). UI components call
 * these functions and never touch `fetch` themselves.
 *
 * Non-2xx responses are translated into a rejected promise with an
 * {@link ApiError} carrying the status and the typed `DomainError`
 * payload from HT-R4 where available.
 */
import type {
  Actor,
  AggregateByTier,
  CrewLead,
  Passenger,
  Resource,
  Tier,
  TopResources,
  UsageEvent,
} from "./types.js";

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api";

/** Closed-form domain error from the server (mirrors `DomainError`). */
export interface DomainErrorPayload {
  readonly kind: string;
  readonly [extra: string]: unknown;
}

/** Anything the client can reject with — typed for exhaustive UI handling. */
export class ApiError extends Error {
  readonly status: number;
  readonly error: DomainErrorPayload | { kind: "Http"; message: string };

  constructor(
    status: number,
    error: DomainErrorPayload | { kind: "Http"; message: string },
  ) {
    super(`${String(status)} ${error.kind}`);
    this.status = status;
    this.error = error;
  }
}

interface Req {
  readonly method: "GET" | "POST" | "PATCH" | "DELETE";
  readonly path: string;
  readonly body?: unknown;
  readonly actor?: Actor;
}

async function request<T>(req: Req): Promise<T> {
  const headers: Record<string, string> = {};
  if (req.body !== undefined) headers["content-type"] = "application/json";
  if (req.actor) headers["x-actor"] = `${req.actor.kind}:${req.actor.id}`;

  const res = await fetch(`${API_BASE}${req.path}`, {
    method: req.method,
    headers,
    body: req.body === undefined ? undefined : JSON.stringify(req.body),
  });

  const text = await res.text();
  const parsed: unknown = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const body = parsed as { error?: DomainErrorPayload } | undefined;
    if (body?.error && typeof body.error.kind === "string") {
      throw new ApiError(res.status, body.error);
    }
    throw new ApiError(res.status, {
      kind: "Http",
      message: res.statusText || "request failed",
    });
  }

  return parsed as T;
}

// ------ crew leads ----------------------------------------------------

export const listCrewLeads = (): Promise<CrewLead[]> =>
  request({ method: "GET", path: "/crew-leads" });

export const bootstrapCrewLeads = (
  leads: readonly { id: string; name: string }[],
): Promise<CrewLead[]> =>
  request({ method: "POST", path: "/crew-leads/bootstrap", body: { leads } });

// ------ passengers ----------------------------------------------------

export const listPassengers = (): Promise<Passenger[]> =>
  request({ method: "GET", path: "/passengers" });

export const createPassenger = (
  actor: Actor,
  body: { id: string; name: string; tier: Tier },
): Promise<Passenger> =>
  request({ method: "POST", path: "/passengers", body, actor });

export const changePassengerTier = (
  actor: Actor,
  id: string,
  tier: Tier,
): Promise<Passenger> =>
  request({
    method: "PATCH",
    path: `/passengers/${encodeURIComponent(id)}/tier`,
    body: { tier },
    actor,
  });

export const deletePassenger = (actor: Actor, id: string): Promise<Passenger> =>
  request({
    method: "DELETE",
    path: `/passengers/${encodeURIComponent(id)}`,
    actor,
  });

// ------ resources -----------------------------------------------------

export const listResources = (tier?: Tier): Promise<Resource[]> =>
  request({
    method: "GET",
    path: tier ? `/resources?tier=${tier}` : "/resources",
  });

export const createResource = (
  actor: Actor,
  body: { id: string; name: string; category: string; minTier: Tier },
): Promise<Resource> =>
  request({ method: "POST", path: "/resources", body, actor });

// ------ access --------------------------------------------------------

export const useResource = (
  actor: Actor,
  resourceId: string,
): Promise<UsageEvent> =>
  request({
    method: "POST",
    path: "/access/use",
    body: { resourceId },
    actor,
  });

// ------ reports -------------------------------------------------------

export const personalHistory = (passengerId: string): Promise<UsageEvent[]> =>
  request({
    method: "GET",
    path: `/reports/history/${encodeURIComponent(passengerId)}`,
  });

export const aggregateByTier = (): Promise<AggregateByTier> =>
  request({ method: "GET", path: "/reports/aggregate-by-tier" });

export const topResources = (n: number): Promise<TopResources> =>
  request({ method: "GET", path: `/reports/top-resources?n=${String(n)}` });
