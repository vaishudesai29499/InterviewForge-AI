// In-memory per-session rate limiting. Good enough for a single-process,
// free-tier deployment; no Redis required. Buckets reset naturally as old
// timestamps age out of the window.
const buckets = new Map();

export function rateLimit({ windowMs = 60 * 60 * 1000, max, keyPrefix }) {
  return (req, res, next) => {
    const sessionId = req.sessionId || req.ip;
    const key = `${keyPrefix}:${sessionId}`;
    const now = Date.now();

    const timestamps = (buckets.get(key) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= max) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `Too many requests. Limit is ${max} per hour — please try again later.`,
        },
      });
    }

    timestamps.push(now);
    buckets.set(key, timestamps);
    next();
  };
}

export const analyzeRateLimit = rateLimit({
  max: Number(process.env.RATE_LIMIT_ANALYZE_PER_HOUR || 5),
  keyPrefix: 'analyze',
});
