import type { UsageEvent } from "../domain/usage-event.js";

/**
 * Port: read-only view of the usage trail.
 *
 * `UsageEventSink` extends this — anything that can record events can
 * also enumerate them. Reporting depends only on the read side (ISP).
 * See specs/07-reporting.md.
 */
export interface UsageEventSource {
  list(): readonly UsageEvent[];
}
