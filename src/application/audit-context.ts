import type { AdminEventSink } from "./admin-event-sink.js";
import type { Clock } from "../infrastructure/clock.js";

/**
 * Optional auditing capability supplied to admin services.
 * When provided, successful mutations emit `AdminEvent`s to `sink`.
 * See specs/06-audit.md (AU-R6).
 */
export interface AuditContext {
  readonly clock: Clock;
  readonly sink: AdminEventSink;
  readonly idGen: () => string;
}
