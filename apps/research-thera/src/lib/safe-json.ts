/**
 * Safe JSON parse with fallback — prevents a single corrupted record from
 * crashing an entire database query.
 */
export function safeJsonParse<T>(
  raw: string | null | undefined,
  fallback: T,
): T {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn(
      `[safeJsonParse] Failed to parse JSON (${raw.length} chars): ${raw.slice(0, 120)}`,
    );
    return fallback;
  }
}
