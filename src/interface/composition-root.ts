import { randomUUID } from "node:crypto";
import { AccessService } from "../application/access.service.js";
import type { AdminEventSink } from "../application/admin-event-sink.js";
import { AuditEmitter } from "../application/audit-emitter.js";
import { CrewLeadService } from "../application/crew-lead.service.js";
import { PassengerService } from "../application/passenger.service.js";
import { ReportingService } from "../application/reporting.service.js";
import { ResourceService } from "../application/resource.service.js";
import type { UsageEventSink } from "../application/usage-event-sink.js";
import { systemClock, type Clock } from "../infrastructure/clock.js";
import { InMemoryAdminEventSink } from "../infrastructure/in-memory-admin-event-sink.js";
import { InMemoryUsageEventSink } from "../infrastructure/in-memory-usage-event-sink.js";

/**
 * Bag of fully-wired services and their backing sinks.
 *
 * Returned by {@link buildApp}. Expose sinks (not just services) so
 * callers — CLI, integration tests — can inspect the event trail.
 */
export interface AppContext {
  readonly clock: Clock;
  readonly adminEvents: AdminEventSink;
  readonly usageEvents: UsageEventSink;
  readonly crewLeads: CrewLeadService;
  readonly passengers: PassengerService;
  readonly resources: ResourceService;
  readonly access: AccessService;
  readonly reporting: ReportingService;
}

/**
 * Composition root — the single place that wires services + adapters.
 *
 * All dependency injection happens here (AGENTS.md §10: DIP). Tests
 * override `clock` and `idGen` with `FakeClock` and a counter to get
 * deterministic output. Production uses `systemClock` and `randomUUID`.
 * Pass `adminSink` / `usageSink` to swap in alternate persistence
 * adapters (e.g. `JsonFileAdminEventSink` — see specs/08-persistence.md).
 *
 * @param opts.clock      Optional clock; defaults to the system clock.
 * @param opts.idGen      Optional id generator; defaults to `crypto.randomUUID`.
 * @param opts.adminSink  Optional admin-event sink; defaults to in-memory.
 * @param opts.usageSink  Optional usage-event sink; defaults to in-memory.
 */
export function buildApp(
  opts: {
    clock?: Clock;
    idGen?: () => string;
    adminSink?: AdminEventSink;
    usageSink?: UsageEventSink;
  } = {},
): AppContext {
  const clock = opts.clock ?? systemClock;
  const idGen = opts.idGen ?? ((): string => randomUUID());

  const adminEvents: AdminEventSink =
    opts.adminSink ?? new InMemoryAdminEventSink();
  const usageEvents: UsageEventSink =
    opts.usageSink ?? new InMemoryUsageEventSink();

  // Single AuditEmitter shared across all admin services.
  const audit = new AuditEmitter({ clock, sink: adminEvents, idGen });
  const crewLeads = new CrewLeadService(audit);
  const passengers = new PassengerService(clock, audit);
  const resources = new ResourceService(clock, audit);
  const access = new AccessService(
    passengers,
    resources,
    usageEvents,
    clock,
    idGen,
  );
  const reporting = new ReportingService(usageEvents);

  return {
    clock,
    adminEvents,
    usageEvents,
    crewLeads,
    passengers,
    resources,
    access,
    reporting,
  };
}
