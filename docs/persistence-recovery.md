# Persistence Recovery Scenarios

The JSONL adapters persist event history, not live service objects. Services rebuild reporting from durable event sinks when the adapters are reused in a new composition root.

## Durable

- `AdminEvent` rows appended by admin services.
- `UsageEvent` rows appended by access checks.
- Event order within each file.

## Recomputed

- Report aggregates are recomputed from `UsageEventSource.list()`.
- In-memory passenger/resource stores are not reconstructed from JSONL by the current adapter.
- Demo seed state is re-applied idempotently by `seedDemoWorld`.

## Corruption Policy

- Missing files load as empty event lists.
- Missing parent directories are created on first append.
- A malformed JSON line fails construction with the file path and line number.
- A line with missing required fields also fails construction.
- The adapter never truncates or repairs a corrupt file automatically; operators should restore or edit the JSONL with an audit note.

## Verification

```bash
npm run test:coverage
```

The persistence integration suite covers restart/reload behavior, missing files, parent directory creation, and corrupt-line failures.
