/**
 * Canonical skill -> known aliases. Keeps obvious equivalences (React.js ==
 * React) out of the LLM entirely. Extend freely; this is a plain data file.
 */
export const SKILL_ALIASES = {
  javascript: ['javascript', 'js', 'es6', 'ecmascript'],
  typescript: ['typescript', 'ts'],
  'react.js': ['react', 'reactjs', 'react.js'],
  'node.js': ['node', 'nodejs', 'node.js'],
  'next.js': ['next', 'nextjs', 'next.js'],
  'vue.js': ['vue', 'vuejs', 'vue.js'],
  angular: ['angular', 'angularjs', 'angular.js'],
  express: ['express', 'expressjs', 'express.js'],
  python: ['python', 'py'],
  java: ['java'],
  'c++': ['c++', 'cpp'],
  'c#': ['c#', 'csharp', 'c-sharp'],
  golang: ['go', 'golang'],
  postgresql: ['postgres', 'postgresql', 'psql'],
  mysql: ['mysql'],
  mongodb: ['mongo', 'mongodb'],
  redis: ['redis'],
  aws: ['amazon web services', 'aws'],
  gcp: ['google cloud', 'google cloud platform', 'gcp'],
  azure: ['microsoft azure', 'azure'],
  docker: ['docker', 'containerization'],
  kubernetes: ['kubernetes', 'k8s'],
  'rest api': ['rest', 'rest api', 'restful api', 'restful apis', 'rest apis'],
  graphql: ['graphql'],
  'ci/cd': ['ci/cd', 'cicd', 'continuous integration', 'continuous deployment'],
  git: ['git', 'version control'],
  html: ['html', 'html5'],
  css: ['css', 'css3'],
  tailwindcss: ['tailwind', 'tailwindcss', 'tailwind css'],
  sql: ['sql'],
  'machine learning': ['machine learning', 'ml'],
  'deep learning': ['deep learning', 'dl'],
  'natural language processing': ['nlp', 'natural language processing'],
  llm: ['llm', 'large language model', 'large language models'],
  rag: ['rag', 'retrieval augmented generation', 'retrieval-augmented generation'],
  pandas: ['pandas'],
  numpy: ['numpy'],
  tensorflow: ['tensorflow', 'tf'],
  pytorch: ['pytorch', 'torch'],
  'django': ['django'],
  flask: ['flask'],
  fastapi: ['fastapi', 'fast api'],
  agile: ['agile', 'scrum'],
};

// skill alias (lowercased) -> canonical name
const ALIAS_LOOKUP = new Map();
for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
  for (const alias of aliases) {
    ALIAS_LOOKUP.set(alias.toLowerCase().trim(), canonical);
  }
}

/**
 * Related-but-not-identical skill pairs that should count as a PARTIAL match
 * rather than a full match or a miss. Symmetric.
 */
const PARTIAL_PAIRS = [
  ['flask', 'django'],
  ['flask', 'fastapi'],
  ['django', 'fastapi'],
  ['mysql', 'postgresql'],
  ['mongodb', 'postgresql'],
  ['vue.js', 'react.js'],
  ['angular', 'react.js'],
  ['tensorflow', 'pytorch'],
];
const PARTIAL_SET = new Set(
  PARTIAL_PAIRS.flatMap(([a, b]) => [`${a}|${b}`, `${b}|${a}`])
);

export function normalizeSkill(raw) {
  if (!raw) return null;
  const cleaned = String(raw).toLowerCase().trim().replace(/\s+/g, ' ');
  if (!cleaned) return null;
  return ALIAS_LOOKUP.get(cleaned) || cleaned;
}

export function normalizeSkillList(list = []) {
  const seen = new Set();
  const result = [];
  for (const item of list) {
    const normalized = normalizeSkill(item);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push({ raw: item, normalized });
    }
  }
  return result;
}

/**
 * Deterministic (no-LLM) classification of a required skill against a set of
 * normalized resume skills. Returns 'match' | 'partial' | 'unknown'.
 * 'unknown' means the two normalization tables couldn't resolve it and it
 * should be escalated to the LLM for a semantic judgment.
 */
export function ruleBasedSkillMatch(requiredNormalized, resumeNormalizedSet) {
  if (resumeNormalizedSet.has(requiredNormalized)) return 'match';

  for (const resumeSkill of resumeNormalizedSet) {
    if (PARTIAL_SET.has(`${requiredNormalized}|${resumeSkill}`)) return 'partial';
    // Substring containment on multi-word canonical names (e.g. "rest api" vs "api").
    if (
      requiredNormalized.length > 3 &&
      (resumeSkill.includes(requiredNormalized) || requiredNormalized.includes(resumeSkill))
    ) {
      return 'partial';
    }
  }

  return 'unknown';
}
