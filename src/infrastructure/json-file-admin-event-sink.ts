import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import type { AdminEventSink } from "../application/admin-event-sink.js";
import type { AdminEvent } from "../domain/admin-event.js";

/**
 * JSON-lines durable adapter for {@link AdminEventSink}.
 *
 * One JSON object per line; appends are atomic-per-record via
 * `appendFileSync`. Parent directory is created on construction
 * (PE-R5). Existing lines are loaded into the in-memory snapshot so
 * `list()` reflects history across process restarts (PE-R4).
 *
 * See specs/08-persistence.md.
 */
export class JsonFileAdminEventSink implements AdminEventSink {
  private readonly events: AdminEvent[];

  constructor(private readonly filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
    this.events = existsSync(filePath) ? loadAdminEvents(filePath) : [];
  }

  record(event: AdminEvent): void {
    this.events.push(event);
    appendFileSync(this.filePath, `${JSON.stringify(event)}\n`, "utf8");
  }

  list(): readonly AdminEvent[] {
    return this.events.slice();
  }
}

function loadAdminEvents(filePath: string): AdminEvent[] {
  const raw = readFileSync(filePath, "utf8");
  const lines = raw.split("\n").filter((l) => l.length > 0);
  return lines.map((line, idx) => parseAdminEvent(line, filePath, idx + 1));
}

function parseAdminEvent(
  line: string,
  filePath: string,
  lineNo: number,
): AdminEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    throw new Error(
      `Corrupt admin event at ${filePath}:${String(lineNo)}: invalid JSON`,
    );
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { id?: unknown }).id !== "string" ||
    typeof (parsed as { action?: unknown }).action !== "string" ||
    typeof (parsed as { actorId?: unknown }).actorId !== "string" ||
    typeof (parsed as { targetId?: unknown }).targetId !== "string" ||
    typeof (parsed as { timestamp?: unknown }).timestamp !== "string"
  ) {
    throw new Error(
      `Corrupt admin event at ${filePath}:${String(lineNo)}: missing fields`,
    );
  }
  return parsed as AdminEvent;
}
