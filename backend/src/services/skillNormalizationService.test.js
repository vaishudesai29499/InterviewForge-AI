import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSkill } from './skillNormalizationService.js';

test('skill normalization: known aliases resolve to the same canonical skill', () => {
  assert.equal(normalizeSkill('React.js'), 'react.js');
  assert.equal(normalizeSkill('ReactJS'), 'react.js');
  assert.equal(normalizeSkill('react'), 'react.js');
  assert.equal(normalizeSkill('PostgreSQL'), 'postgresql');
  assert.equal(normalizeSkill('Postgres'), 'postgresql');
  assert.equal(normalizeSkill('AWS'), 'aws');
  assert.equal(normalizeSkill('Amazon Web Services'), 'aws');
});

test('skill normalization: unknown skills pass through lowercased/trimmed', () => {
  assert.equal(normalizeSkill('  Some Custom Tool  '), 'some custom tool');
});

test('skill normalization: null/empty input returns null', () => {
  assert.equal(normalizeSkill(''), null);
  assert.equal(normalizeSkill(null), null);
});
