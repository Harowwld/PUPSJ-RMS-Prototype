// Lightweight in-memory cache for client-side data fetching (Stale-While-Revalidate pattern)
const memoryCache = new Map();

/**
 * Get cached data if available and unexpired.
 * @param {string} key Cache key
 * @returns {any | null}
 */
export function getCachedData(key) {
  if (typeof window === "undefined") return null;
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

/**
 * Set cached data with TTL.
 * @param {string} key Cache key
 * @param {any} data Data payload
 * @param {number} [ttlMs=60000] Expiry in milliseconds (default 1 minute)
 */
export function setCachedData(key, data, ttlMs = 60000) {
  if (typeof window === "undefined") return;
  memoryCache.set(key, {
    data,
    expiry: Date.now() + ttlMs,
  });
}

/**
 * Invalidate a specific cache key or keys matching prefix.
 * @param {string} [prefix]
 */
export function invalidateDataCache(prefix) {
  if (!prefix) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}
