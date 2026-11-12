import "server-only";

/* Tracen topics 10–13: Timeouts, Retries + Exponential Backoff + Jitter, Circuit Breaker. */

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Timed out after ${ms}ms`);
    this.name = "TimeoutError";
  }
}
export class CircuitOpenError extends Error {
  constructor(name: string) {
    super(`Circuit "${name}" is open`);
    this.name = "CircuitOpenError";
  }
}

/** Topic 11 — never wait forever. */
export function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
): Promise<T> {
  const ac = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ac.abort();
      reject(new TimeoutError(ms));
    }, ms);
  });
  return Promise.race([fn(ac.signal), timeout]).finally(() =>
    clearTimeout(timer),
  );
}

/** Only transient failures are worth retrying (5xx, 429, timeouts, network). Never 4xx. */
export function isTransient(err: unknown) {
  if (err instanceof TimeoutError) return true;
  const status = (err as { status?: number })?.status;
  if (typeof status === "number") return status >= 500 || status === 429;
  return err instanceof TypeError; // fetch network failure
}

/** 1st retry ≈ base, 2nd ≈ 2×base, 3rd ≈ 4×base … randomised so clients don't retry in lockstep. */
export function backoffMs(attempt: number, baseMs = 500, maxMs = 8000) {
  const ceiling = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
  return Math.round(ceiling / 2 + Math.random() * (ceiling / 2));
}

/** Topics 12+13 — retry with exponential backoff and jitter. Never retries 4xx. */
export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  { attempts = 3, baseMs = 500, maxMs = 8000 } = {},
): Promise<T> {
  let lastErr: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn(i);
    } catch (err) {
      lastErr = err;
      if (i === attempts || !isTransient(err)) break;
      await new Promise((r) => setTimeout(r, backoffMs(i, baseMs, maxMs)));
    }
  }
  throw lastErr;
}

/** Topic 10 — Circuit breaker: after N consecutive failures, fail fast for a cool-down. */
export class CircuitBreaker {
  private failures = 0;
  private openedAt = 0;
  constructor(
    private name: string,
    private threshold = 5,
    private coolDownMs = 30_000,
  ) {}

  get state() {
    if (this.failures < this.threshold) return "closed" as const;
    return Date.now() - this.openedAt >= this.coolDownMs
      ? ("half-open" as const)
      : ("open" as const);
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") throw new CircuitOpenError(this.name);
    try {
      const out = await fn();
      this.failures = 0;
      return out;
    } catch (err) {
      this.failures++;
      if (this.failures >= this.threshold) this.openedAt = Date.now();
      throw err;
    }
  }

  /** Graceful degradation: return `fallback` instead of failing the whole page. */
  async runOr<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await this.run(fn);
    } catch {
      return fallback;
    }
  }
}

const breakers = new Map<string, CircuitBreaker>();
export function breaker(name: string, threshold?: number, coolDownMs?: number) {
  let b = breakers.get(name);
  if (!b) breakers.set(name, (b = new CircuitBreaker(name, threshold, coolDownMs)));
  return b;
}
