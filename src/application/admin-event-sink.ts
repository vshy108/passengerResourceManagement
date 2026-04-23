import type { AdminEvent } from "../domain/admin-event.js";

/**
 * Port: append-only sink for admin events.
 *
 * Defined in `application/` so services depend on the interface, not a
 * concrete store (DIP). Implementations live in `infrastructure/` —
 * e.g. `InMemoryAdminEventSink`, or a future JSON/DB adapter.
 * See specs/06-audit.md (AU-I1).
 */
export interface AdminEventSink {
  /** Append a new admin event. Implementations must never lose events. */
  record(event: AdminEvent): void;
  /** Snapshot of all recorded events, in insertion order. */
  list(): readonly AdminEvent[];
}
