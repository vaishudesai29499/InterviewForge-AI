import { GoogleGenerativeAI } from '@google/generative-ai';
import { extractJsonFromText } from '../utils/jsonValidator.js';

const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GoogleGenerativeAI(key);
}

async function callGemini(systemPrompt, userPrompt) {
  const client = getGeminiClient();
  if (!client) {
    const err = new Error('AI_UNAVAILABLE');
    err.code = 'AI_UNAVAILABLE';
    throw err;
  }

  const model = client.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      // Note: some Gemini 3.x models no longer support temperature/top_p/top_k
      // tuning the same way older models did — leave sampling at provider
      // defaults rather than passing deprecated params.
      maxOutputTokens: 4096,
    },
  });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
  });

  const response = result.response;
  const text = response?.text?.();
  if (!text) throw new Error('Gemini returned an empty response');
  return text;
}

async function callGroq(systemPrompt, userPrompt) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    const err = new Error('No fallback AI provider configured');
    err.code = 'AI_UNAVAILABLE';
    throw err;
  }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (response.status === 429) {
    const error = new Error('Rate limit exceeded on fallback provider. Please try again later.');
    error.statusCode = 429;
    throw error;
  }
  if (!response.ok) {
    throw new Error(`Fallback provider error (${response.status})`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Fallback provider returned an empty response');
  return content;
}

async function callProvider(systemPrompt, userPrompt) {
  const primary = AI_PROVIDER === 'groq' ? callGroq : callGemini;
  const hasFallback = Boolean(process.env.GROQ_API_KEY) && AI_PROVIDER !== 'groq';

  try {
    return await primary(systemPrompt, userPrompt);
  } catch (primaryError) {
    console.error('Primary AI provider failed:', primaryError?.message || primaryError);
    if (hasFallback) {
      console.warn('Falling back to secondary AI provider...');
      return callGroq(systemPrompt, userPrompt);
    }
    throw primaryError;
  }
}

/**
 * Ask the model for a JSON object matching `schema`. Validates the response
 * and retries at most ONCE with a compact correction prompt if validation
 * fails. Never retries more than once, and never silently accepts malformed
 * output — a second failure throws a user-friendly error.
 */
export async function generateStructured({ systemPrompt, userPrompt, schema }) {
  const raw = await callProvider(systemPrompt, userPrompt);

  const attempt = tryValidate(raw, schema);
  if (attempt.success) return attempt.data;

  console.warn('AI response failed validation, retrying once:', attempt.error);

  const correctionPrompt = `${userPrompt}\n\nYour previous response was invalid JSON or did not match the required schema (${attempt.error}). Return ONLY corrected JSON matching the schema exactly, with no extra commentary.`;

  const retryRaw = await callProvider(systemPrompt, correctionPrompt);
  const retryAttempt = tryValidate(retryRaw, schema);
  if (retryAttempt.success) return retryAttempt.data;

  const err = new Error('The AI returned a response we could not validate. Please try again.');
  err.statusCode = 502;
  throw err;
}

function tryValidate(raw, schema) {
  try {
    const jsonStr = extractJsonFromText(raw);
    const parsed = JSON.parse(jsonStr);
    const data = schema.parse(parsed);
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function isAiConfigured() {
  if (AI_PROVIDER === 'groq') return Boolean(process.env.GROQ_API_KEY);
  return Boolean(process.env.GEMINI_API_KEY) || Boolean(process.env.GROQ_API_KEY);
}
