import type { UsageEvent } from "../domain/usage-event.js";
import type { UsageEventSink } from "../application/usage-event-sink.js";

/**
 * In-memory append-only sink for usage events.
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
