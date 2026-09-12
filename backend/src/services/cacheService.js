import { JsonCollection } from '../repositories/jsonStore.js';
import { stableHash } from '../utils/hash.js';

const cacheStore = new JsonCollection('ai-cache');

const DEFAULT_TTL_HOURS = Number(process.env.ANALYSIS_CACHE_TTL_HOURS || 24);

function isExpired(entry, ttlHours) {
  return Date.now() - entry.cachedAt > ttlHours * 60 * 60 * 1000;
}

/**
 * Wraps an expensive (LLM) computation with a hash-keyed cache so repeated
 * requests for the same normalized input (e.g. page refresh) never trigger a
 * duplicate API call. Returns { value, cacheHit }.
 */
export async function withCache(namespace, keyInput, computeFn, { ttlHours = DEFAULT_TTL_HOURS } = {}) {
  const key = `${namespace}:${stableHash(keyInput)}`;
  const existing = await cacheStore.get(key);

  if (existing && !isExpired(existing, ttlHours)) {
    return { value: existing.value, cacheHit: true };
  }

  const value = await computeFn();
  await cacheStore.set(key, { value, cachedAt: Date.now() });
  return { value, cacheHit: false };
}

export async function pruneExpiredCache(ttlHours = DEFAULT_TTL_HOURS) {
  const cutoff = Date.now() - ttlHours * 60 * 60 * 1000;
  return cacheStore.deleteWhere((entry) => entry.cachedAt < cutoff);
}
