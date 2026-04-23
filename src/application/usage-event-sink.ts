import type { UsageEvent } from "../domain/usage-event.js";
import type { UsageEventSource } from "./usage-event-source.js";

/**
 * Port: append-only sink for usage events.
 * Extends `UsageEventSource` — any sink is also a readable source.
 * Implementations live in `infrastructure/`.
 * See AGENTS.md §10 (ISP) and specs/05-access.md (AC-I2).
 */
export interface UsageEventSink extends UsageEventSource {
  record(event: UsageEvent): void;
}
