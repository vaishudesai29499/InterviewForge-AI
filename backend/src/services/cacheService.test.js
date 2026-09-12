import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { withCache } from './cacheService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cacheFile = path.join(__dirname, '..', '..', 'data', 'ai-cache.json');

test.after(async () => {
  await fs.rm(cacheFile, { force: true });
});

test('cache: first request is a MISS, identical request is a HIT', async () => {
  let calls = 0;
  const compute = async () => {
    calls++;
    return { result: 'computed' };
  };

  const first = await withCache('unit-test', { question: 'q1', answer: 'a1' }, compute);
  const second = await withCache('unit-test', { question: 'q1', answer: 'a1' }, compute);

  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, true);
  assert.equal(calls, 1);
});

test('cache: a changed answer produces a fresh MISS (not the stale cached result)', async () => {
  let calls = 0;
  const compute = async () => {
    calls++;
    return { result: `computed-${calls}` };
  };

  const first = await withCache('unit-test-2', { question: 'q1', answer: 'original' }, compute);
  const changed = await withCache('unit-test-2', { question: 'q1', answer: 'edited' }, compute);

  assert.equal(first.cacheHit, false);
  assert.equal(changed.cacheHit, false);
  assert.equal(calls, 2);
});
