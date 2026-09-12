import { withCache } from './cacheService.js';
import { generateStructured, isAiConfigured } from './aiProviderService.js';
import {
  extractionResponseSchema,
  semanticAnalysisSchema,
} from '../utils/jsonValidator.js';
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionPrompt,
  SEMANTIC_ANALYSIS_SYSTEM_PROMPT,
  buildSemanticAnalysisPrompt,
} from '../utils/promptTemplates.js';
import { matchSkillsDeterministic, mergeSemanticSkillResults } from './matchingService.js';
import { computeSkillScore, computeOverallScore, heuristicSubScores } from './scoringService.js';

/**
 * Step 1: parse resume/JD text into structured JSON. Cached by exact text
 * content so re-analyzing identical documents never re-triggers the LLM.
 */
export async function extractStructuredData(resumeText, jdText) {
  const { value, cacheHit } = await withCache(
    'extraction',
    { resumeText, jdText },
    async () => {
      if (!isAiConfigured()) {
        const err = new Error('AI provider is not configured. Set GEMINI_API_KEY in backend/.env.');
        err.statusCode = 503;
        throw err;
      }
      return generateStructured({
        systemPrompt: EXTRACTION_SYSTEM_PROMPT,
        userPrompt: buildExtractionPrompt(resumeText, jdText),
        schema: extractionResponseSchema,
      });
    }
  );
  return { ...value, cacheHit };
}

/**
 * Step 2 + 3: rule-based skill matching first, LLM only for the leftover
 * ambiguous skills + relevance sub-scores, then deterministic scoring.
 */
export async function analyzeMatch(resumeStructured, jdStructured) {
  const deterministic = matchSkillsDeterministic(resumeStructured, jdStructured);
  const ambiguousSkillNames = deterministic.ambiguous.map((a) => a.skill);

  let semantic;
  let cacheHit = false;

  if (isAiConfigured()) {
    const result = await withCache(
      'semantic-analysis',
      { resumeStructured, jdStructured, ambiguousSkillNames },
      () =>
        generateStructured({
          systemPrompt: SEMANTIC_ANALYSIS_SYSTEM_PROMPT,
          userPrompt: buildSemanticAnalysisPrompt({
            resumeStructured,
            jdStructured,
            ambiguousSkills: ambiguousSkillNames,
          }),
          schema: semanticAnalysisSchema,
        })
    );
    semantic = result.value;
    cacheHit = result.cacheHit;
  } else {
    // Graceful degradation: no AI configured, use heuristics so the app
    // still works end-to-end (with a clearly lower-fidelity result).
    const heuristics = heuristicSubScores(resumeStructured, jdStructured);
    semantic = {
      skillVerdicts: ambiguousSkillNames.map((skill) => ({ skill, verdict: 'missing', reason: 'AI unavailable — could not verify' })),
      experience: { score: heuristics.experience, matchedExperience: [], experienceGaps: [], explanation: 'Estimated without AI.' },
      responsibilities: { score: heuristics.responsibilities, explanation: 'Estimated without AI.' },
      projects: { score: heuristics.projects, explanation: 'Estimated without AI.' },
      education: { score: heuristics.education, explanation: 'Estimated without AI.' },
      strengths: [],
      topActions: [],
      summary: 'AI provider not configured — showing a heuristic estimate only.',
    };
  }

  const { matching, partialMatches, missing } = mergeSemanticSkillResults(deterministic, semantic.skillVerdicts);

  const missingWithDetail = missing.map((m) => ({
    skill: m.skill,
    priority: m.priority,
    reason: m.reason,
    recommendedAction: `Practice or build a small project demonstrating ${m.skill}.`,
  }));

  const skillScore = computeSkillScore(deterministic, missing);
  const { overallScore, breakdown } = computeOverallScore({
    skills: skillScore,
    experience: semantic.experience.score,
    responsibilities: semantic.responsibilities.score,
    projects: semantic.projects.score,
    education: semantic.education.score,
  });

  return {
    // Backward-compatible top-level fields (existing frontend keeps working)
    matchScore: overallScore,
    experienceRelevancyScore: semantic.experience.score,
    matchingSkills: matching,
    missingSkills: missingWithDetail.map((m) => m.skill),
    summary: semantic.summary,

    // Richer fields for the upgraded dashboard
    breakdown,
    partialSkills: partialMatches,
    missingSkillDetails: missingWithDetail,
    experienceRelevance: semantic.experience,
    responsibilities: semantic.responsibilities,
    projects: semantic.projects,
    education: semantic.education,
    strengths: semantic.strengths,
    topActions: semantic.topActions,
    aiCacheHit: cacheHit,
  };
}
