/**
 * Durable Object sliding-window rate limiter.
 *
 * Each instance is keyed (by caller via `idFromName`) to a single
 * rate-limit bucket (e.g. one IP or one session cookie). It persists a
 * list of hit timestamps and evicts any older than `now - windowMs`
 * before deciding whether to allow the current request.
 */
export class RateLimiter {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(req: Request): Promise<Response> {
    const { limit, windowMs } = (await req.json()) as {
      limit: number;
      windowMs: number;
    };

    const now = Date.now();
    const cutoff = now - windowMs;

    let timestamps = (await this.state.storage.get<number[]>("ts")) ?? [];
    timestamps = timestamps.filter((t) => t > cutoff);

    if (timestamps.length >= limit) {
      const oldest = timestamps[0]!;
      const resetMs = oldest + windowMs - now;
      return Response.json({ allowed: false, remaining: 0, resetMs });
    }

    timestamps.push(now);
    await this.state.storage.put("ts", timestamps);

    return Response.json({
      allowed: true,
      remaining: limit - timestamps.length,
      resetMs: windowMs,
    });
  }
}
