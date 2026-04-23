import type { AdminEvent } from "../domain/admin-event.js";

/**
 * Port: append-only sink for admin events.
 * See specs/06-audit.md (AU-I1).
 */
export interface AdminEventSink {
  record(event: AdminEvent): void;
  list(): readonly AdminEvent[];
}
