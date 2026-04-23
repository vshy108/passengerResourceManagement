import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";
import cors from "@fastify/cors";
import type { Actor } from "../../domain/actor.js";
import { toCrewLeadId, type CrewLead } from "../../domain/crew-lead.js";
import type { DomainError } from "../../domain/errors.js";
import { toPassengerId } from "../../domain/passenger.js";
import { toResourceId } from "../../domain/resource.js";
import type { Result } from "../../domain/result.js";
import { TIERS, type Tier } from "../../domain/tier.js";
import type { AppContext } from "../composition-root.js";

/**
 * Thin HTTP adapter over the application services.
 *
 * Build once per process via {@link createHttpApp}. The factory takes
 * an already-wired {@link AppContext} so tests can inject fake clocks
 * and id generators. All business logic lives in the services; this
 * module only translates HTTP \u2194 `Result<T, DomainError>`.
 *
 * See specs/09-http.md.
 */
export function createHttpApp(ctx: AppContext): FastifyInstance {
  const app = Fastify({ logger: false });

  // Allow the browser UI to call this API from any origin (dev & prod).
  // Plugin registration is lazy; fastify flushes it before
  // listen()/inject(), so createHttpApp can stay synchronous.
  void app.register(cors, { origin: true });

  // ------ health ---------------------------------------------------

  app.get("/health", () => ({ status: "ok" }));

  // ------ crew leads -----------------------------------------------

  app.post("/crew-leads/bootstrap", (req, reply) => {
    const body = req.body;
    if (!isObject(body) || !Array.isArray(body.leads)) {
      return reply.code(400).send({ error: "expected { leads: [] }" });
    }
    const leads: CrewLead[] = [];
    for (const raw of body.leads) {
      if (
        !isObject(raw) ||
        typeof raw.id !== "string" ||
        typeof raw.name !== "string"
      ) {
        return reply.code(400).send({ error: "invalid lead entry" });
      }
      leads.push({ id: toCrewLeadId(raw.id), name: raw.name });
    }
    return send(reply, ctx.crewLeads.bootstrap(leads), 201);
  });

  app.get("/crew-leads", () => ctx.crewLeads.list());

  // ------ passengers -----------------------------------------------

  app.post("/passengers", (req, reply) => {
    const actor = parseActor(req.headers["x-actor"]);
    if (!actor) return reply.code(400).send({ error: "missing x-actor" });

    const body = req.body;
    if (
      !isObject(body) ||
      typeof body.id !== "string" ||
      typeof body.name !== "string" ||
      !isTier(body.tier)
    ) {
      return reply.code(400).send({ error: "invalid body" });
    }
    return send(
      reply,
      ctx.passengers.create(actor, {
        id: toPassengerId(body.id),
        name: body.name,
        tier: body.tier,
      }),
      201,
    );
  });

  app.get("/passengers", () => ctx.passengers.list());

  app.get<{ Params: { id: string } }>("/passengers/:id", (req, reply) =>
    send(reply, ctx.passengers.get(toPassengerId(req.params.id))),
  );

  app.patch<{ Params: { id: string } }>(
    "/passengers/:id/tier",
    (req, reply) => {
      const actor = parseActor(req.headers["x-actor"]);
      if (!actor) return reply.code(400).send({ error: "missing x-actor" });

      const body = req.body;
      if (!isObject(body) || !isTier(body.tier)) {
        return reply.code(400).send({ error: "invalid body" });
      }
      return send(
        reply,
        ctx.passengers.changeTier(
          actor,
          toPassengerId(req.params.id),
          body.tier,
        ),
      );
    },
  );

  app.delete<{ Params: { id: string } }>("/passengers/:id", (req, reply) => {
    const actor = parseActor(req.headers["x-actor"]);
    if (!actor) return reply.code(400).send({ error: "missing x-actor" });
    return send(
      reply,
      ctx.passengers.softDelete(actor, toPassengerId(req.params.id)),
    );
  });

  // ------ resources ------------------------------------------------

  app.post("/resources", (req, reply) => {
    const actor = parseActor(req.headers["x-actor"]);
    if (!actor) return reply.code(400).send({ error: "missing x-actor" });

    const body = req.body;
    if (
      !isObject(body) ||
      typeof body.id !== "string" ||
      typeof body.name !== "string" ||
      typeof body.category !== "string" ||
      !isTier(body.minTier)
    ) {
      return reply.code(400).send({ error: "invalid body" });
    }
    return send(
      reply,
      ctx.resources.create(actor, {
        id: toResourceId(body.id),
        name: body.name,
        category: body.category,
        minTier: body.minTier,
      }),
      201,
    );
  });

  app.get<{ Querystring: { tier?: string } }>("/resources", (req) => {
    const q = req.query.tier;
    if (q !== undefined && isTier(q)) {
      return ctx.resources.listAccessibleFor(q);
    }
    return ctx.resources.list();
  });

  // ------ access ---------------------------------------------------

  app.post("/access/use", (req, reply) => {
    const actor = parseActor(req.headers["x-actor"]);
    if (!actor) return reply.code(400).send({ error: "missing x-actor" });

    const body = req.body;
    if (!isObject(body) || typeof body.resourceId !== "string") {
      return reply.code(400).send({ error: "invalid body" });
    }
    return send(
      reply,
      ctx.access.useResource(actor, toResourceId(body.resourceId)),
      201,
    );
  });

  // ------ reports --------------------------------------------------

  app.get<{ Params: { passengerId: string } }>(
    "/reports/history/:passengerId",
    (req) =>
      ctx.reporting.personalHistory(toPassengerId(req.params.passengerId)),
  );

  app.get("/reports/aggregate-by-tier", () => ctx.reporting.aggregateByTier());

  app.get<{ Querystring: { n?: string } }>("/reports/top-resources", (req) => {
    const n = Number(req.query.n ?? "3");
    return ctx.reporting.topResources(Number.isFinite(n) ? n : 0);
  });

  return app;
}

// ------ helpers ----------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isTier(v: unknown): v is Tier {
  return typeof v === "string" && (TIERS as readonly string[]).includes(v);
}

/**
 * Parse the `x-actor` header of the form `<kind>:<id>`.
 * Returns `undefined` when missing or malformed.
 */
function parseActor(raw: string | string[] | undefined): Actor | undefined {
  if (typeof raw !== "string") return undefined;
  const [kind, id] = raw.split(":", 2);
  if (!kind || !id) return undefined;
  if (kind === "CrewLead") return { kind: "CrewLead", id: toCrewLeadId(id) };
  if (kind === "Passenger") return { kind: "Passenger", id: toPassengerId(id) };
  return undefined;
}

/**
 * Collapse a `Result<T, DomainError>` onto the Fastify reply using the
 * HT-R4 status mapping. On success, sets the provided status (default
 * 200); on failure, produces `{ error: <DomainError> }`.
 */
function send<T>(
  reply: FastifyReply,
  result: Result<T, DomainError>,
  successStatus = 200,
): FastifyReply {
  if (result.ok) return reply.code(successStatus).send(result.value);
  return reply.code(statusFor(result.error)).send({ error: result.error });
}

function statusFor(e: DomainError): number {
  // Exhaustive mapping: adding a new `DomainError` variant will fail
  // typecheck until a status is chosen for it.
  const map: Record<DomainError["kind"], number> = {
    UnauthorizedActor: 403,
    AccessDenied: 403,
    PassengerNotFound: 404,
    ResourceNotFound: 404,
    CrewLeadNotFound: 404,
    PassengerAlreadyExists: 409,
    ResourceAlreadyExists: 409,
    CrewLeadAlreadyExists: 409,
    CrewLeadLimitReached: 409,
    CrewLeadMinimumBreached: 409,
    CrewLeadBootstrapInvalid: 409,
  };
  return map[e.kind];
}
