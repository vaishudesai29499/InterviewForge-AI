import { validateTextInput } from '../services/fileParserService.js';
import { extractStructuredData, analyzeMatch } from '../services/analysisService.js';
import * as analysisRepo from '../repositories/analysisRepository.js';

function toPublicAnalysis(record) {
  if (!record) return null;
  return {
    id: record.id,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    analysis: record.analysis,
  };
}

export async function createAnalysisHandler(req, res) {
  try {
    const { resumeText, jdText } = req.body;
    if (!resumeText || !jdText) {
      return res.status(400).json({ success: false, error: { message: 'resumeText and jdText are required' } });
    }

    const cleanedResume = validateTextInput(resumeText, 'Resume');
    const cleanedJD = validateTextInput(jdText, 'Job description');

    const extraction = await extractStructuredData(cleanedResume, cleanedJD);
    const analysis = await analyzeMatch(extraction.resume, extraction.jd);

    const record = await analysisRepo.createAnalysis({
      sessionId: req.sessionId,
      resumeStructured: extraction.resume,
      jdStructured: extraction.jd,
      analysis,
    });

    res.json({ success: true, data: toPublicAnalysis(record) });
  } catch (err) {
    console.error('Analysis error:', err.message);
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, error: { code: err.code, message: err.message || 'Analysis failed. Please try again.' } });
  }
}

export async function getAnalysisHandler(req, res) {
  const record = await analysisRepo.getAnalysisForSession(req.params.id, req.sessionId);
  if (!record) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Analysis not found or expired' } });
  }
  res.json({ success: true, data: toPublicAnalysis(record) });
}

export async function deleteAnalysisHandler(req, res) {
  const deleted = await analysisRepo.deleteAnalysis(req.params.id, req.sessionId);
  if (!deleted) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Analysis not found or expired' } });
  }
  res.json({ success: true, data: { deleted: true } });
}
