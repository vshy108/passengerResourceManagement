/**
 * Clock abstraction — injected into services to keep `domain/` and
 * `application/` deterministic in tests.
 * See AGENTS.md §3.
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** Deterministic clock for tests. */
export class FakeClock implements Clock {
  private current: Date;

  constructor(initial: Date = new Date("2026-01-01T00:00:00.000Z")) {
    this.current = initial;
  }

  now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }

  set(d: Date): void {
    this.current = new Date(d);
  }
}
