import { deleteExpiredSessions } from '../repositories/sessionRepository.js';
import { deleteExpiredAnalyses } from '../repositories/analysisRepository.js';
import { pruneExpiredCache } from './cacheService.js';

const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 24);
const CACHE_TTL_HOURS = Number(process.env.ANALYSIS_CACHE_TTL_HOURS || 24);
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // hourly

async function runCleanup() {
  try {
    await deleteExpiredAnalyses(SESSION_TTL_HOURS);
    await deleteExpiredSessions(SESSION_TTL_HOURS);
    await pruneExpiredCache(CACHE_TTL_HOURS);
  } catch (err) {
    console.error('Cleanup job failed:', err.message);
  }
}

/**
 * Privacy / auto-delete (Section 7): analyses (and the resume/JD data they
 * hold) are removed automatically once they're older than SESSION_TTL_HOURS.
 * Runs once at startup, then hourly.
 */
export function startCleanupSchedule() {
  runCleanup();
  return setInterval(runCleanup, CLEANUP_INTERVAL_MS);
}
