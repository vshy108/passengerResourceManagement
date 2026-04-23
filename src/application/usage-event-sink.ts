import type { UsageEvent } from "../domain/usage-event.js";
import type { UsageEventSource } from "./usage-event-source.js";

/**
 * Port: append-only sink for usage events.
 *
 * Extends `UsageEventSource`, so any sink is also a readable source —
 * the composition root wires the same object to `AccessService`
 * (writer) and `ReportingService` (reader).
 * Implementations live in `infrastructure/`.
 * See AGENTS.md §10 (ISP) and specs/05-access.md (AC-I2).
 */
export interface UsageEventSink extends UsageEventSource {
  /** Append a new usage event. Implementations must never lose events. */
  record(event: UsageEvent): void;
}
