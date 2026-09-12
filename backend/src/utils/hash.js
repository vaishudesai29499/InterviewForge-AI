import crypto from 'crypto';

/**
 * Stable hash for any JSON-serializable value (or string). Used to key the
 * AI response cache so identical inputs never trigger a duplicate LLM call.
 */
export function stableHash(value) {
  const normalized = typeof value === 'string' ? value : stringifyStable(value);
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

function stringifyStable(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stringifyStable).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stringifyStable(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
