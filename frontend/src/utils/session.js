const STORAGE_KEY = 'interviewforge_session_id';

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getSessionId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage unavailable (e.g. private mode edge cases) — fall back to
    // an in-memory id for this page load only.
    return generateId();
  }
}

export function setSessionId(id) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}
