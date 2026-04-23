import type { UsageEvent } from "../domain/usage-event.js";

/**
 * Port: append-only sink for usage events.
 * Implementations live in `infrastructure/`.
 * See AGENTS.md §10 (ISP) and specs/05-access.md (AC-I2).
 */
export interface UsageEventSink {
  record(event: UsageEvent): void;
  list(): readonly UsageEvent[];
}
