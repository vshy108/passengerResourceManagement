/**
 * Integration tests for the JSON file persistence adapters.
 * Covers specs/08-persistence.md (PE-R1..R6, PE-S1..S4).
 *
 * Exception to AGENTS.md §4 "no real filesystem in tests": these are
 * *infrastructure adapter* tests for a filesystem adapter — they use
 * a per-test temp directory under `os.tmpdir()` and clean it up.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { toAdminEventId } from "../../src/domain/admin-event.js";
import { toCrewLeadId } from "../../src/domain/crew-lead.js";
import { toPassengerId } from "../../src/domain/passenger.js";
import { toResourceId } from "../../src/domain/resource.js";
import { toUsageEventId } from "../../src/domain/usage-event.js";
import { JsonFileAdminEventSink } from "../../src/infrastructure/json-file-admin-event-sink.js";
import { JsonFileUsageEventSink } from "../../src/infrastructure/json-file-usage-event-sink.js";

describe("JSON file persistence (PE-R1..R6)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "prms-persist-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  describe("JsonFileAdminEventSink", () => {
    const sample = {
      id: toAdminEventId("A1"),
      actorId: toCrewLeadId("CL1"),
      action: "PassengerCreated" as const,
      targetKind: "Passenger" as const,
      targetId: "P1",
      timestamp: "2026-01-01T00:00:00.000Z",
    };

    it("PE-S1: round-trips events across instances", () => {
      const path = join(dir, "admin.jsonl");
      const firstSink = new JsonFileAdminEventSink(path);
      firstSink.record(sample);
      firstSink.record({ ...sample, id: toAdminEventId("A2"), targetId: "P2" });

      const reloadedSink = new JsonFileAdminEventSink(path);
      expect(reloadedSink.list()).toHaveLength(2);
      expect(reloadedSink.list()[0]!.id).toBe("A1");
      expect(reloadedSink.list()[1]!.id).toBe("A2");
    });

    it("PE-S5: reloads events appended after a process restart", () => {
      const path = join(dir, "admin-restart.jsonl");
      const firstProcessSink = new JsonFileAdminEventSink(path);
      firstProcessSink.record(sample);

      const secondProcessSink = new JsonFileAdminEventSink(path);
      secondProcessSink.record({ ...sample, id: toAdminEventId("A2"), targetId: "P2" });

      const recoveredSink = new JsonFileAdminEventSink(path);
      expect(recoveredSink.list().map((event) => event.id)).toEqual(["A1", "A2"]);
    });

    it("PE-S2: returns [] when file does not exist", () => {
      const sink = new JsonFileAdminEventSink(join(dir, "missing.jsonl"));
      expect(sink.list()).toEqual([]);
    });

    it("PE-R3: record() updates the in-memory snapshot immediately", () => {
      const sink = new JsonFileAdminEventSink(join(dir, "admin.jsonl"));
      expect(sink.list()).toEqual([]);
      sink.record(sample);
      expect(sink.list()).toHaveLength(1);
    });

    it("PE-S3: creates missing parent directories", () => {
      const nested = join(dir, "a", "b", "c", "admin.jsonl");
      const sink = new JsonFileAdminEventSink(nested);
      sink.record(sample);
      expect(readFileSync(nested, "utf8")).toContain('"id":"A1"');
    });

    it("PE-S4: throws on corrupt JSON line", () => {
      const path = join(dir, "bad.jsonl");
      writeFileSync(path, "{not json}\n", "utf8");
      expect(() => new JsonFileAdminEventSink(path)).toThrow(/invalid JSON/);
    });

    it("PE-S6: reports the corrupt line without truncating valid history", () => {
      const path = join(dir, "mixed-admin.jsonl");
      writeFileSync(path, `${JSON.stringify(sample)}\n{not json}\n`, "utf8");

      expect(() => new JsonFileAdminEventSink(path)).toThrow(/:2: invalid JSON/);
      expect(readFileSync(path, "utf8")).toContain('"id":"A1"');
    });

    it("PE-R6: throws on missing required fields", () => {
      const path = join(dir, "bad.jsonl");
      writeFileSync(path, `${JSON.stringify({ id: "A1" })}\n`, "utf8");
      expect(() => new JsonFileAdminEventSink(path)).toThrow(/missing fields/);
    });
  });

  describe("JsonFileUsageEventSink", () => {
    const sample = {
      id: toUsageEventId("U1"),
      passengerId: toPassengerId("P1"),
      resourceId: toResourceId("R1"),
      tierAtAttempt: "Gold" as const,
      minTierAtAttempt: "Silver" as const,
      timestamp: "2026-01-01T00:00:00.000Z",
      outcome: "ALLOWED" as const,
    };

    it("PE-S1: round-trips events across instances", () => {
      const path = join(dir, "usage.jsonl");
      const firstSink = new JsonFileUsageEventSink(path);
      firstSink.record(sample);
      firstSink.record({ ...sample, id: toUsageEventId("U2"), outcome: "DENIED" });

      const reloadedSink = new JsonFileUsageEventSink(path);
      expect(reloadedSink.list()).toHaveLength(2);
      expect(reloadedSink.list()[1]!.outcome).toBe("DENIED");
    });

    it("PE-S5: reloads usage events appended across restarts", () => {
      const path = join(dir, "usage-restart.jsonl");
      const firstProcessSink = new JsonFileUsageEventSink(path);
      firstProcessSink.record(sample);

      const secondProcessSink = new JsonFileUsageEventSink(path);
      secondProcessSink.record({ ...sample, id: toUsageEventId("U2"), outcome: "DENIED" });

      const recoveredSink = new JsonFileUsageEventSink(path);
      expect(recoveredSink.list().map((event) => event.id)).toEqual(["U1", "U2"]);
    });

    it("PE-S2: returns [] when file does not exist", () => {
      const sink = new JsonFileUsageEventSink(join(dir, "missing.jsonl"));
      expect(sink.list()).toEqual([]);
    });

    it("PE-S3: creates missing parent directories", () => {
      const nested = join(dir, "x", "y", "usage.jsonl");
      const sink = new JsonFileUsageEventSink(nested);
      sink.record(sample);
      expect(readFileSync(nested, "utf8")).toContain('"id":"U1"');
    });

    it("PE-S4: throws on corrupt JSON line", () => {
      const path = join(dir, "bad.jsonl");
      writeFileSync(path, "not-json\n", "utf8");
      expect(() => new JsonFileUsageEventSink(path)).toThrow(/invalid JSON/);
    });

    it("PE-S6: reports corrupt usage lines without repairing the file", () => {
      const path = join(dir, "mixed-usage.jsonl");
      writeFileSync(path, `${JSON.stringify(sample)}\nnot-json\n`, "utf8");

      expect(() => new JsonFileUsageEventSink(path)).toThrow(/:2: invalid JSON/);
      expect(readFileSync(path, "utf8")).toContain('"id":"U1"');
    });

    it("PE-R6: throws on missing required fields", () => {
      const path = join(dir, "bad.jsonl");
      writeFileSync(
        path,
        `${JSON.stringify({ id: "U1", passengerId: "P1" })}\n`,
        "utf8",
      );
      expect(() => new JsonFileUsageEventSink(path)).toThrow(/missing fields/);
    });

    it("integrates with buildApp via the usageSink override", async () => {
      const { buildApp } =
        await import("../../src/interface/composition-root.js");
      const usagePath = join(dir, "usage.jsonl");
      const adminPath = join(dir, "admin.jsonl");
      const app = buildApp({
        adminSink: new JsonFileAdminEventSink(adminPath),
        usageSink: new JsonFileUsageEventSink(usagePath),
      });
      expect(app.usageEvents.list()).toEqual([]);
      expect(app.adminEvents.list()).toEqual([]);
    });
  });
});
