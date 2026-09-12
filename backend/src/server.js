import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import multer from 'multer';

import { upload, uploadDocuments, parseSingleFile } from './controllers/uploadController.js';
import {
  createAnalysisHandler,
  getAnalysisHandler,
  deleteAnalysisHandler,
} from './controllers/analysisController.js';
import { sessionMiddleware } from './middleware/session.js';
import { analyzeRateLimit } from './middleware/rateLimiter.js';
import { isAiConfigured } from './services/aiProviderService.js';
import { startCleanupSchedule } from './services/sessionService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(sessionMiddleware());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'InterviewForge AI Backend', aiConfigured: isAiConfigured() });
});

// --- Upload & parsing (no AI, no session data stored) ----------------------
app.post(
  '/api/upload',
  upload.fields([
    { name: 'resume', maxCount: 1 },
    { name: 'jd', maxCount: 1 },
  ]),
  uploadDocuments
);
app.post('/api/upload/single', upload.single('file'), parseSingleFile);

// --- Analysis lifecycle (score + gap analysis) -------------------------------
app.post('/api/analysis', analyzeRateLimit, createAnalysisHandler);
app.get('/api/analysis/:id', getAnalysisHandler);
app.delete('/api/analysis/:id', deleteAnalysisHandler);

// --- Production: serve the built frontend ----------------------------------
if (NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// --- Error handling ----------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message);

  if (err instanceof multer.MulterError) {
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ success: false, error: { code: err.code, message: err.message } });
  }

  const status = err.statusCode || 500;
  // Never leak stack traces or provider secrets to the client.
  res.status(status).json({
    success: false,
    error: { code: err.code || 'SERVER_ERROR', message: status === 500 ? 'Internal server error' : err.message },
  });
});

startCleanupSchedule();

app.listen(PORT, () => {
  console.log(`InterviewForge AI backend running on http://localhost:${PORT}`);
  if (!isAiConfigured()) {
    console.warn('⚠️  No AI provider configured — set GEMINI_API_KEY in backend/.env to enable analysis.');
  }
});
