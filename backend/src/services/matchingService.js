import { normalizeSkill, normalizeSkillList, ruleBasedSkillMatch } from './skillNormalizationService.js';

/**
 * Collect every skill-like string mentioned anywhere in the structured
 * resume (explicit skills list + technologies used in experience/projects).
 */
function collectResumeSkillPool(resumeStructured) {
  const pool = new Set(resumeStructured.skills || []);
  for (const exp of resumeStructured.experience || []) {
    for (const r of exp.responsibilities || []) {
      // responsibilities are free text; skip — normalization only applies to
      // explicit skill/technology tokens, not full sentences.
      void r;
    }
  }
  for (const proj of resumeStructured.projects || []) {
    for (const tech of proj.technologies || []) pool.add(tech);
  }
  return Array.from(pool);
}

/**
 * Deterministic (rule-based) pass over required + preferred JD skills against
 * the resume's skill pool. Anything that can't be confidently classified is
 * returned in `ambiguous` for a single batched LLM lookup — this is what
 * keeps "Python vs Python", "React vs React.js" etc. off the LLM entirely.
 */
export function matchSkillsDeterministic(resumeStructured, jdStructured) {
  const resumeSkillPool = collectResumeSkillPool(resumeStructured);
  const resumeNormalized = normalizeSkillList(resumeSkillPool);
  const resumeNormalizedSet = new Set(resumeNormalized.map((s) => s.normalized));

  const requiredSkills = jdStructured.requiredSkills || [];
  const preferredSkills = jdStructured.preferredSkills || [];

  const matches = [];
  const partial = [];
  const ambiguous = [];

  const classify = (skill, priority) => {
    const normalized = normalizeSkill(skill);
    if (!normalized) return;
    const result = ruleBasedSkillMatch(normalized, resumeNormalizedSet);
    if (result === 'match') {
      matches.push({ skill, normalized, priority });
    } else if (result === 'partial') {
      partial.push({ skill, normalized, priority });
    } else {
      ambiguous.push({ skill, normalized, priority });
    }
  };

  requiredSkills.forEach((s) => classify(s, 'critical'));
  preferredSkills.forEach((s) => classify(s, 'important'));

  return { matches, partial, ambiguous, resumeSkillPool };
}

/**
 * Merge the deterministic pass with the LLM's semantic judgments for the
 * skills that couldn't be resolved by rules alone.
 *
 * semanticResults: [{ skill, verdict: 'match'|'partial'|'missing', reason }]
 */
export function mergeSemanticSkillResults(deterministic, semanticResults = []) {
  const bySkill = new Map(semanticResults.map((r) => [r.skill, r]));

  const matching = [...deterministic.matches.map((m) => m.skill)];
  const partialMatches = [...deterministic.partial.map((p) => p.skill)];
  const missing = [];

  for (const item of deterministic.ambiguous) {
    const semantic = bySkill.get(item.skill);
    if (!semantic || semantic.verdict === 'missing') {
      missing.push({
        skill: item.skill,
        priority: item.priority,
        reason: semantic?.reason || 'Required by JD but not demonstrated in resume',
      });
    } else if (semantic.verdict === 'match') {
      matching.push(item.skill);
    } else {
      partialMatches.push(item.skill);
    }
  }

  return { matching, partialMatches, missing };
}
