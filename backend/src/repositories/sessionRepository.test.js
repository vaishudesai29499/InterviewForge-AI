import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSession, getSession, touchSession } from './sessionRepository.js';
import { createAnalysis, getAnalysis, deleteAnalysis } from './analysisRepository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', '..', 'data');

test.after(async () => {
  await fs.rm(path.join(dataDir, 'sessions.json'), { force: true });
  await fs.rm(path.join(dataDir, 'analyses.json'), { force: true });
});

test('session lifecycle: create -> get -> touch', async () => {
  const session = await createSession();
  assert.ok(session.id);

  const fetched = await getSession(session.id);
  assert.equal(fetched.id, session.id);

  const touched = await touchSession(session.id);
  assert.ok(new Date(touched.lastSeenAt) >= new Date(session.lastSeenAt));
});

test('analysis lifecycle: create -> get -> update -> delete', async () => {
  const session = await createSession();
  const record = await createAnalysis({
    sessionId: session.id,
    resumeStructured: { skills: [] },
    jdStructured: { requiredSkills: [] },
    analysis: { matchScore: 50 },
  });

  const fetched = await getAnalysis(record.id);
  assert.equal(fetched.id, record.id);
  assert.equal(fetched.analysis.matchScore, 50);

  const deleted = await deleteAnalysis(record.id, session.id);
  assert.equal(deleted, true);

  const afterDelete = await getAnalysis(record.id);
  assert.equal(afterDelete, null);
});

test('analysis delete is scoped to the owning session', async () => {
  const sessionA = await createSession();
  const sessionB = await createSession();
  const record = await createAnalysis({
    sessionId: sessionA.id,
    resumeStructured: {},
    jdStructured: {},
    analysis: {},
  });

  const deletedByWrongSession = await deleteAnalysis(record.id, sessionB.id);
  assert.equal(deletedByWrongSession, false);

  const stillThere = await getAnalysis(record.id);
  assert.ok(stillThere);

  await deleteAnalysis(record.id, sessionA.id);
});
