/**
 * Shared utilities for company resolvers.
 */

/**
 * Safely parse JSON strings with proper error handling and logging.
 * Prevents crashes from malformed JSON data in database.
 */
export function safeJsonParse<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn("[safeJsonParse] Failed to parse JSON:", {
      error: error instanceof Error ? error.message : String(error),
      valueLength: value?.length,
      valuePreview: value?.substring(0, 100),
    });
    return defaultValue;
  }
}
