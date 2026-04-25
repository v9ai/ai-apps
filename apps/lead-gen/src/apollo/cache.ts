import { unstable_cache } from "next/cache";

const DEFAULT_TTL_SEC = 120;

// Why: read resolvers like `companies` re-wake Neon on every page nav. Wrapping
// the pure (args -> rows) fetcher with the Vercel data cache turns repeat reads
// into zero DB wake-ups. Staleness window equals `revalidateSec` (default 2m).
// How to apply: pass a fetcher whose args are JSON-serializable; the cache key
// is derived from the args plus `keyParts`. Never close over `context.db` — use
// the module-scoped `httpDb` so cached calls don't capture per-request state.
export function withEdgeCache<Args extends unknown[], R>(
  fetcher: (...args: Args) => Promise<R>,
  keyParts: string[],
  revalidateSec: number = DEFAULT_TTL_SEC,
) {
  return unstable_cache(fetcher, keyParts, { revalidate: revalidateSec });
}
