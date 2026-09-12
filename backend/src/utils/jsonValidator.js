import { z } from 'zod';

export function extractJsonFromText(text) {
  const trimmed = String(text).trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

export function parseAndValidate(jsonString, schema) {
  const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
  return schema.parse(parsed);
}

// ---------------------------------------------------------------------------
// Structured extraction (resume + JD) — Section 4
// ---------------------------------------------------------------------------

const experienceEntrySchema = z.object({
  title: z.string().default(''),
  company: z.string().default(''),
  duration: z.string().default(''),
  responsibilities: z.array(z.string()).default([]),
});

const projectEntrySchema = z.object({
  name: z.string().default(''),
  technologies: z.array(z.string()).default([]),
  description: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
});

export const resumeStructuredSchema = z.object({
  candidate: z.object({
    name: z.string().default(''),
    email: z.string().default(''),
    phone: z.string().default(''),
  }),
  summary: z.string().default(''),
  skills: z.array(z.string()).default([]),
  experience: z.array(experienceEntrySchema).default([]),
  projects: z.array(projectEntrySchema).default([]),
  education: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
});

export const jdStructuredSchema = z.object({
  role: z.string().default(''),
  company: z.string().default(''),
  requiredExperience: z.number().nullable().default(null),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  education: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
});

export const extractionResponseSchema = z.object({
  resume: resumeStructuredSchema,
  jd: jdStructuredSchema,
});

// ---------------------------------------------------------------------------
// Semantic analysis (ambiguous skills + relevance sub-scores) — Sections 3, 12, 14
// ---------------------------------------------------------------------------

export const semanticAnalysisSchema = z.object({
  skillVerdicts: z
    .array(
      z.object({
        skill: z.string(),
        verdict: z.enum(['match', 'partial', 'missing']),
        reason: z.string().default(''),
      })
    )
    .default([]),
  experience: z.object({
    score: z.number().min(0).max(100),
    matchedExperience: z.array(z.string()).default([]),
    experienceGaps: z.array(z.string()).default([]),
    explanation: z.string().default(''),
  }),
  responsibilities: z.object({
    score: z.number().min(0).max(100),
    explanation: z.string().default(''),
  }),
  projects: z.object({
    score: z.number().min(0).max(100),
    explanation: z.string().default(''),
  }),
  education: z.object({
    score: z.number().min(0).max(100),
    explanation: z.string().default(''),
  }),
  strengths: z.array(z.string()).default([]),
  topActions: z.array(z.string()).max(3).default([]),
  summary: z.string().default(''),
});

