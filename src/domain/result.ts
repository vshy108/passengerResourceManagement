/**
 * Result<T, E> — discriminated union for expected failures.
 *
 * Services return a `Result` instead of throwing. `throw` is reserved
 * for programmer errors and invariant violations (AGENTS.md §3).
 * Consumers narrow with `result.ok`:
 *
 * ```ts
 * const r = service.doThing();
 * if (!r.ok) return r.error;        // domain error, handle or propagate
 * doSomething(r.value);              // happy path
 * ```
 */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/** Wrap a success value. */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/** Wrap a failure value. */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });
