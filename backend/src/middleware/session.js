import { createSession, getSession, touchSession } from '../repositories/sessionRepository.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Anonymous, no-login session handling. The client generates (or receives)
 * a random UUID and sends it as X-Session-Id on every request. The backend
 * never issues passwords, cookies-with-identity, or accounts — this ID is
 * only used to scope temporary analysis data and rate limits.
 */
export function sessionMiddleware() {
  return async (req, res, next) => {
    try {
      const headerId = req.header('x-session-id');
      let sessionId = headerId && UUID_RE.test(headerId) ? headerId : null;

      if (sessionId) {
        const existing = await getSession(sessionId);
        if (existing) {
          await touchSession(sessionId);
        } else {
          // Client sent an ID we don't know (expired/deleted) — recreate it
          // under the same ID so the client doesn't need to change anything.
          await createSession(sessionId);
        }
      } else {
        const session = await createSession();
        sessionId = session.id;
      }

      req.sessionId = sessionId;
      res.setHeader('X-Session-Id', sessionId);
      next();
    } catch (err) {
      next(err);
    }
  };
}
