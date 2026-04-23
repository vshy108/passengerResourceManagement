/**
 * Clock abstraction — injected into services so that `domain/` and
 * `application/` stay deterministic (AGENTS.md §3).
 *
 * Production wiring uses `systemClock`; tests use `FakeClock` to
 * advance time explicitly without touching the real system clock.
 */
export interface Clock {
  /** Current wall-clock time. */
  now(): Date;
}

/** Production clock backed by `new Date()`. */
export const systemClock: Clock = {
  now: () => new Date(),
};

/**
 * Deterministic clock for tests.
 *
 * Returns a defensive copy from `now()` so callers cannot mutate the
 * internal instant. Use `advance(ms)` or `set(date)` to move time.
 */
export class FakeClock implements Clock {
  private current: Date;

  constructor(initial: Date = new Date("2026-01-01T00:00:00.000Z")) {
    this.current = initial;
  }

  now(): Date {
    return new Date(this.current);
  }

  /** Move the clock forward by `ms` milliseconds. */
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }

  /** Set the clock to a specific instant. */
  set(d: Date): void {
    this.current = new Date(d);
  }
}
