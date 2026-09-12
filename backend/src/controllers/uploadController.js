import multer from 'multer';
import { validateFile, parseFileBuffer, cleanText, validateTextInput } from '../services/fileParserService.js';

const storage = multer.memoryStorage();
const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_MB || 5) * 1024 * 1024;

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 2 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

async function resolveText(file, textInput, label) {
  if (file) {
    validateFile(file);
    const parsed = await parseFileBuffer(file.buffer, file.mimetype);
    return validateTextInput(parsed, label);
  }
  if (textInput) {
    return validateTextInput(textInput, label);
  }
  const err = new Error(`${label} file or text is required`);
  err.statusCode = 400;
  throw err;
}

export async function uploadDocuments(req, res) {
  try {
    const resumeFile = req.files?.resume?.[0];
    const jdFile = req.files?.jd?.[0];

    const [resumeText, jdText] = await Promise.all([
      resolveText(resumeFile, req.body?.resumeText, 'Resume'),
      resolveText(jdFile, req.body?.jdText, 'Job description'),
    ]);

    res.json({
      success: true,
      data: {
        resumeText: cleanText(resumeText),
        jdText: cleanText(jdText),
        resumePreview: cleanText(resumeText).slice(0, 500),
        jdPreview: cleanText(jdText).slice(0, 500),
      },
    });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(err.statusCode || 400).json({ success: false, error: { message: err.message || 'Failed to process upload' } });
  }
}

export async function parseSingleFile(req, res) {
  try {
    const file = req.file;
    const { type } = req.body;

    if (!file) {
      return res.status(400).json({ success: false, error: { message: 'No file uploaded' } });
    }

    validateFile(file);
    const parsed = await parseFileBuffer(file.buffer, file.mimetype);
    const text = validateTextInput(parsed, type === 'jd' ? 'Job description' : 'Resume');

    res.json({
      success: true,
      data: {
        type: type || 'unknown',
        text: cleanText(text),
        preview: cleanText(text).slice(0, 500),
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
}
