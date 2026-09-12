import crypto from 'crypto';
import { JsonCollection } from './jsonStore.js';

const sessions = new JsonCollection('sessions');

export async function createSession(explicitId) {
  const id = explicitId || crypto.randomUUID();
  const now = new Date().toISOString();
  const session = { id, createdAt: now, lastSeenAt: now };
  await sessions.set(id, session);
  return session;
}

export async function getSession(id) {
  if (!id) return null;
  return sessions.get(id);
}

export async function touchSession(id) {
  if (!id) return null;
  return sessions.update(id, (current) =>
    current ? { ...current, lastSeenAt: new Date().toISOString() } : current
  );
}

export async function deleteExpiredSessions(ttlHours) {
  const cutoff = Date.now() - ttlHours * 60 * 60 * 1000;
  return sessions.deleteWhere((s) => new Date(s.lastSeenAt).getTime() < cutoff);
}
