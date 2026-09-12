import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractJsonFromText, semanticAnalysisSchema } from './jsonValidator.js';

test('extractJsonFromText: pulls JSON out of a markdown code fence', () => {
  const text = 'Here you go:\n```json\n{"a": 1}\n```';
  assert.equal(extractJsonFromText(text), '{"a": 1}');
});

test('extractJsonFromText: pulls JSON out of surrounding prose', () => {
  const text = 'Sure! {"a": 1} Hope that helps.';
  assert.equal(extractJsonFromText(text), '{"a": 1}');
});

test('AI validation: valid semantic analysis response passes schema', () => {
  const valid = {
    experience: { score: 80 },
    responsibilities: { score: 75 },
    projects: { score: 70 },
    education: { score: 65 },
  };
  const parsed = semanticAnalysisSchema.parse(valid);
  assert.equal(parsed.experience.score, 80);
  assert.deepEqual(parsed.strengths, []); // defaults applied
});

test('AI validation: out-of-range score is rejected', () => {
  const invalid = {
    experience: { score: 150 }, // > 100, invalid
    responsibilities: { score: 75 },
    projects: { score: 70 },
    education: { score: 65 },
  };
  assert.throws(() => semanticAnalysisSchema.parse(invalid));
});

test('AI validation: malformed JSON string throws before schema validation', () => {
  assert.throws(() => JSON.parse(extractJsonFromText('not valid json at all')));
});
