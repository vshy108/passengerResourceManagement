import type { UsageEvent } from "../domain/usage-event.js";

/**
 * Port: read-only view of the usage trail.
 *
 * `UsageEventSink` extends this so any writer is also a reader —
 * `ReportingService` depends only on the read side (ISP), and tests
 * can supply a minimal stub exposing just `list()`.
 * See specs/07-reporting.md.
 */
export interface UsageEventSource {
  /** Snapshot of all recorded usage events, in insertion order. */
  list(): readonly UsageEvent[];
}
