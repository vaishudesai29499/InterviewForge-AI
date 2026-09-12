import crypto from 'crypto';
import { JsonCollection } from './jsonStore.js';

const analyses = new JsonCollection('analyses');

export async function createAnalysis({ sessionId, resumeStructured, jdStructured, analysis }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const record = {
    id,
    sessionId,
    createdAt: now,
    updatedAt: now,
    resumeStructured,
    jdStructured,
    analysis, // deterministic + semantic analysis result
  };
  await analyses.set(id, record);
  return record;
}

export async function getAnalysis(id) {
  return analyses.get(id);
}

export async function getAnalysisForSession(id, sessionId) {
  const record = await analyses.get(id);
  if (!record || record.sessionId !== sessionId) return null;
  return record;
}

export async function deleteAnalysis(id, sessionId) {
  const record = await analyses.get(id);
  if (!record || record.sessionId !== sessionId) return false;
  return analyses.delete(id);
}

export async function deleteExpiredAnalyses(ttlHours) {
  const cutoff = Date.now() - ttlHours * 60 * 60 * 1000;
  return analyses.deleteWhere((a) => new Date(a.updatedAt).getTime() < cutoff);
}
