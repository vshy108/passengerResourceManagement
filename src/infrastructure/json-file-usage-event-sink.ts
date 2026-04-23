import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import { dirname } from "node:path";
import type { UsageEventSink } from "../application/usage-event-sink.js";
import type { UsageEvent } from "../domain/usage-event.js";

/**
 * JSON-lines durable adapter for {@link UsageEventSink}.
 *
 * Mirrors {@link JsonFileAdminEventSink}: one JSON object per line,
 * appended synchronously, reloaded on construction (PE-R3..R4).
 *
 * See specs/08-persistence.md.
 */
export class JsonFileUsageEventSink implements UsageEventSink {
  private readonly events: UsageEvent[];

  constructor(private readonly filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
    this.events = existsSync(filePath) ? loadUsageEvents(filePath) : [];
  }

  record(event: UsageEvent): void {
    this.events.push(event);
    appendFileSync(this.filePath, `${JSON.stringify(event)}\n`, "utf8");
  }

  list(): readonly UsageEvent[] {
    return this.events.slice();
  }
}

function loadUsageEvents(filePath: string): UsageEvent[] {
  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split("\n").filter((l) => l.length > 0);
  return lines.map((line, idx) => parseUsageEvent(line, filePath, idx + 1));
}

function parseUsageEvent(
  line: string,
  filePath: string,
  lineNo: number,
): UsageEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    throw new Error(
      `Corrupt usage event at ${filePath}:${String(lineNo)}: invalid JSON`,
    );
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { id?: unknown }).id !== "string" ||
    typeof (parsed as { passengerId?: unknown }).passengerId !== "string" ||
    typeof (parsed as { resourceId?: unknown }).resourceId !== "string" ||
    typeof (parsed as { tierAtAttempt?: unknown }).tierAtAttempt !==
      "string" ||
    typeof (parsed as { minTierAtAttempt?: unknown }).minTierAtAttempt !==
      "string" ||
    typeof (parsed as { timestamp?: unknown }).timestamp !== "string" ||
    typeof (parsed as { outcome?: unknown }).outcome !== "string"
  ) {
    throw new Error(
      `Corrupt usage event at ${filePath}:${String(lineNo)}: missing fields`,
    );
  }
  return parsed as UsageEvent;
}
