import { getSessionId, setSessionId } from '../utils/session';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const headers = { 'X-Session-Id': getSessionId(), ...(options.headers || {}) };
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  const returnedSessionId = response.headers.get('X-Session-Id');
  if (returnedSessionId) setSessionId(returnedSessionId);

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.error?.message || data?.error || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.code = data?.error?.code;
    throw error;
  }

  return data;
}

// --- Upload & parsing --------------------------------------------------------

export async function uploadDocuments({ resumeFile, jdFile, resumeText, jdText }) {
  const formData = new FormData();
  if (resumeFile) formData.append('resume', resumeFile);
  if (jdFile) formData.append('jd', jdFile);
  if (resumeText) formData.append('resumeText', resumeText);
  if (jdText) formData.append('jdText', jdText);

  return request('/api/upload', { method: 'POST', body: formData });
}

// --- Analysis lifecycle -------------------------------------------------------

export async function createAnalysis(resumeText, jdText) {
  return request('/api/analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeText, jdText }),
  });
}

export async function getAnalysis(analysisId) {
  return request(`/api/analysis/${analysisId}`);
}

export async function deleteAnalysis(analysisId) {
  return request(`/api/analysis/${analysisId}`, { method: 'DELETE' });
}

export async function healthCheck() {
  return request('/api/health');
}
