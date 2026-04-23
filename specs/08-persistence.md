# 08 — JSON File Persistence

**Status:** Optional / above-and-beyond (plan §13).

Demonstrates the Ports & Adapters pattern: swap in-memory event storage
for durable JSON-lines files **without touching the domain or
application layers**.

## Glossary reuse
Re-uses `AdminEvent`, `UsageEvent`, `AdminEventSink`, `UsageEventSink`,
`UsageEventSource` from `specs/00-glossary.md`.

## Rules

- **PE-R1** A `JsonFileAdminEventSink` implements `AdminEventSink`
  backed by a JSON-lines (JSONL) file at a caller-provided path.
- **PE-R2** A `JsonFileUsageEventSink` implements `UsageEventSink`
  (which extends `UsageEventSource`) with the same JSONL scheme.
- **PE-R3** `record(event)` appends a single JSON object per line,
  terminated by `\n`. The in-memory snapshot returned by `list()`
  reflects the append immediately.
- **PE-R4** On construction, the sink loads existing events from the
  file (if any) into its in-memory snapshot so `list()` is consistent
  across process restarts.
- **PE-R5** The parent directory of the target path is created on
  construction if it does not already exist.
- **PE-R6** A corrupt line (malformed JSON or missing required fields)
  raises at construction time — never silently dropped.

## Invariants

- **PE-I1** Files are append-only during a process's lifetime; existing
  lines are never rewritten or reordered.
- **PE-I2** Adapters do not touch domain types — they serialise via
  `JSON.stringify` and validate shape on read.

## Scenarios

- **PE-S1** Round-trip: record N events, construct a fresh sink over the
  same path, `list()` returns the same N events in order.
- **PE-S2** Empty file / missing file → `list()` returns `[]`.
- **PE-S3** Missing parent directory is created automatically.
- **PE-S4** File containing an invalid line throws on construction.

## Composition

The composition root accepts optional `adminSink` / `usageSink`
overrides. Callers wanting durable audit trails construct JSON adapters
and pass them in:

```ts
const ctx = buildApp({
  adminSink: new JsonFileAdminEventSink("./data/admin-events.jsonl"),
  usageSink: new JsonFileUsageEventSink("./data/usage-events.jsonl"),
});
```

Default behaviour (no overrides) remains in-memory, preserving the
zero-setup reviewer DX.
