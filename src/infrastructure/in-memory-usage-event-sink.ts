import type { UsageEvent } from "../domain/usage-event.js";
import type { UsageEventSink } from "../application/usage-event-sink.js";

/**
 * In-memory append-only sink for usage events.
 *
 * Simple array-backed adapter used by the default composition root and
 * by tests. `list()` returns a shallow copy so reporting queries can
 * sort/filter freely without disturbing the canonical event order.
 * See specs/05-access.md (AC-I2).
 */
export class InMemoryUsageEventSink implements UsageEventSink {
  private readonly events: UsageEvent[] = [];

  record(event: UsageEvent): void {
    this.events.push(event);
  }

  list(): readonly UsageEvent[] {
    return this.events.slice();
  }
}
