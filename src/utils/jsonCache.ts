const cache = new Map<string, unknown>();
const MAX_ENTRIES = 32;

/**
 * Parses a persisted JSON object string, memoized by the string itself. Many
 * components parse the same manualData blobs on every render; this parses each
 * distinct value once. Malformed input yields an empty object instead of
 * throwing. Callers must treat the result as read-only (it is shared).
 */
export function parseJsonObjectCached<T extends object = Record<string, unknown>>(json: string | undefined | null): T {
  const key = json || "{}";
  const hit = cache.get(key);
  if (hit !== undefined) return hit as T;

  let parsed: unknown;
  try {
    parsed = JSON.parse(key);
  } catch {
    parsed = {};
  }
  if (parsed === null || typeof parsed !== "object") parsed = {};

  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, parsed);
  return parsed as T;
}
