import type { AdminEvent } from "../domain/admin-event.js";
import type { AdminEventSink } from "../application/admin-event-sink.js";

/**
 * In-memory append-only sink for admin events.
 *
 * Simple array-backed adapter used by the default composition root and
 * by tests. `list()` returns a shallow copy so callers cannot mutate
 * the internal log.
 */
export class InMemoryAdminEventSink implements AdminEventSink {
  private readonly events: AdminEvent[] = [];

  record(event: AdminEvent): void {
    this.events.push(event);
  }

  list(): readonly AdminEvent[] {
    return this.events.slice();
  }
}
