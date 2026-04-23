import { randomUUID } from "node:crypto";
import { AccessService } from "../application/access.service.js";
import { AuditEmitter } from "../application/audit-emitter.js";
import { CrewLeadService } from "../application/crew-lead.service.js";
import { PassengerService } from "../application/passenger.service.js";
import { ReportingService } from "../application/reporting.service.js";
import { ResourceService } from "../application/resource.service.js";
import { systemClock, type Clock } from "../infrastructure/clock.js";
import { InMemoryAdminEventSink } from "../infrastructure/in-memory-admin-event-sink.js";
import { InMemoryUsageEventSink } from "../infrastructure/in-memory-usage-event-sink.js";

export interface AppContext {
  readonly clock: Clock;
  readonly adminEvents: InMemoryAdminEventSink;
  readonly usageEvents: InMemoryUsageEventSink;
  readonly crewLeads: CrewLeadService;
  readonly passengers: PassengerService;
  readonly resources: ResourceService;
  readonly access: AccessService;
  readonly reporting: ReportingService;
}

/**
 * Composition root — the single place that wires services + adapters.
 * See AGENTS.md §10 (DIP, Composition root).
 */
export function buildApp(
  opts: { clock?: Clock; idGen?: () => string } = {},
): AppContext {
  const clock = opts.clock ?? systemClock;
  const idGen = opts.idGen ?? ((): string => randomUUID());

  const adminEvents = new InMemoryAdminEventSink();
  const usageEvents = new InMemoryUsageEventSink();

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
