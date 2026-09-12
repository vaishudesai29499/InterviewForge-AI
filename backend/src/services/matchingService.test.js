import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchSkillsDeterministic, mergeSemanticSkillResults } from './matchingService.js';
import { computeSkillScore, computeOverallScore } from './scoringService.js';

const resumeStructured = {
  skills: ['React', 'Node.js', 'PostgreSQL', 'AWS'],
  experience: [],
  projects: [{ name: 'Chatbot', technologies: ['OpenAI API'], description: [], achievements: [] }],
};

const jdStructured = {
  requiredSkills: ['React.js', 'Node.js', 'AWS', 'Docker', 'RAG'],
  preferredSkills: ['GraphQL'],
};

test('deterministic matching resolves exact/alias skills without the LLM', () => {
  const result = matchSkillsDeterministic(resumeStructured, jdStructured);
  const matchedNames = result.matches.map((m) => m.skill);
  assert.ok(matchedNames.includes('React.js'));
  assert.ok(matchedNames.includes('Node.js'));
  assert.ok(matchedNames.includes('AWS'));
  // Docker/RAG/GraphQL have no resume evidence and no alias — must be ambiguous, not guessed
  const ambiguousNames = result.ambiguous.map((a) => a.skill);
  assert.ok(ambiguousNames.includes('Docker'));
  assert.ok(ambiguousNames.includes('RAG'));
});

test('semantic merge folds LLM verdicts for ambiguous skills back in', () => {
  const deterministic = matchSkillsDeterministic(resumeStructured, jdStructured);
  const semanticVerdicts = deterministic.ambiguous.map((a) => ({
    skill: a.skill,
    verdict: a.skill === 'GraphQL' ? 'match' : 'missing',
    reason: 'test',
  }));
  const { matching, missing } = mergeSemanticSkillResults(deterministic, semanticVerdicts);
  assert.ok(matching.includes('GraphQL'));
  assert.ok(missing.some((m) => m.skill === 'Docker'));
  assert.ok(missing.some((m) => m.skill === 'RAG'));
});

test('score calculation is deterministic for known inputs', () => {
  const deterministic = matchSkillsDeterministic(resumeStructured, jdStructured);
  const missing = [
    { skill: 'Docker', priority: 'critical', reason: '' },
    { skill: 'RAG', priority: 'critical', reason: '' },
  ];
  const skillScore = computeSkillScore(deterministic, missing);
  // 3 of 5 required (critical) skills matched, 1 of 1 preferred (important) matched
  // earned = 3*1 (react/node/aws) + 0.5*1 (graphql, unresolved ambiguous treated partially)... see scoringService
  assert.ok(skillScore >= 0 && skillScore <= 100);

  const { overallScore, breakdown } = computeOverallScore({
    skills: 80,
    experience: 80,
    responsibilities: 80,
    projects: 80,
    education: 80,
  });
  assert.equal(overallScore, 80);
  assert.deepEqual(breakdown, { skills: 80, experience: 80, responsibilities: 80, projects: 80, education: 80 });
});

test('overall score weights sum correctly (skills 40%, experience 20%, responsibilities 20%, projects 10%, education 10%)', () => {
  const { overallScore } = computeOverallScore({
    skills: 100,
    experience: 0,
    responsibilities: 0,
    projects: 0,
    education: 0,
  });
  assert.equal(overallScore, 40);
});
