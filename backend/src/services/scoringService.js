const WEIGHTS = {
  skills: 0.4,
  experience: 0.2,
  responsibilities: 0.2,
  projects: 0.1,
  education: 0.1,
};

function clampScore(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Deterministic skill sub-score: match = 1 point, partial = 0.5 point.
 * Required skills carry full weight, preferred skills carry half weight —
 * arithmetic only, no LLM involved.
 */
export function computeSkillScore(deterministic, missing) {
  const weightOf = (priority) => (priority === 'critical' ? 1 : 0.5);

  let earned = 0;
  let total = 0;

  for (const m of deterministic.matches) {
    earned += weightOf(m.priority);
    total += weightOf(m.priority);
  }
  for (const p of deterministic.partial) {
    earned += weightOf(p.priority) * 0.5;
    total += weightOf(p.priority);
  }
  for (const item of deterministic.ambiguous) {
    const w = weightOf(item.priority);
    total += w;
    const missedEntry = missing.find((m) => m.skill === item.skill);
    if (!missedEntry) {
      // Resolved as match or partial by the semantic pass upstream — the
      // caller is expected to have already folded these into matches/partial
      // for display, but score them the same way here for safety.
      earned += w * 0.75;
    }
  }

  if (total === 0) return 100; // JD listed no skills to compare against
  return clampScore((earned / total) * 100);
}

/**
 * Combine the deterministic skill score with the LLM-derived sub-scores
 * (experience relevance, responsibilities, projects, education) into a
 * single explainable overall score. All arithmetic happens here in code —
 * the LLM only ever supplies the four sub-scores it's asked for.
 */
export function computeOverallScore({ skills, experience, responsibilities, projects, education }) {
  const breakdown = {
    skills: clampScore(skills),
    experience: clampScore(experience),
    responsibilities: clampScore(responsibilities),
    projects: clampScore(projects),
    education: clampScore(education),
  };

  const overallScore = clampScore(
    breakdown.skills * WEIGHTS.skills +
      breakdown.experience * WEIGHTS.experience +
      breakdown.responsibilities * WEIGHTS.responsibilities +
      breakdown.projects * WEIGHTS.projects +
      breakdown.education * WEIGHTS.education
  );

  return { overallScore, breakdown, weights: WEIGHTS };
}

/**
 * Fallback heuristic sub-scores used only if the AI provider is unavailable,
 * so the app still returns a usable (if less nuanced) result instead of
 * failing outright.
 */
export function heuristicSubScores(resumeStructured, jdStructured) {
  const resumeText = JSON.stringify(resumeStructured).toLowerCase();
  const keywordHits = (jdStructured.keywords || []).filter((k) =>
    resumeText.includes(String(k).toLowerCase())
  ).length;
  const keywordTotal = Math.max(1, (jdStructured.keywords || []).length);
  const keywordScore = clampScore((keywordHits / keywordTotal) * 100);

  return {
    experience: keywordScore,
    responsibilities: keywordScore,
    projects: (resumeStructured.projects || []).length > 0 ? 70 : 40,
    education: (resumeStructured.education || []).length > 0 ? 80 : 50,
  };
}
