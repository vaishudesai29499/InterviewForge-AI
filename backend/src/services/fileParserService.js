import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_MB || 5) * 1024 * 1024;

const ALLOWED_MIMES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
};

const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'txt']);

export function validateFile(file) {
  if (!file) {
    throw new Error('No file provided');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
  }

  // Don't trust the browser-supplied MIME type alone — also check the file
  // extension, and reject if they disagree.
  const mimeExt = ALLOWED_MIMES[file.mimetype];
  const nameExt = (file.originalname || '').split('.').pop()?.toLowerCase();

  if (!mimeExt) {
    throw new Error(`Unsupported file type: ${file.mimetype}. Allowed: PDF, DOCX, TXT`);
  }
  if (!ALLOWED_EXTENSIONS.has(nameExt)) {
    throw new Error(`Unsupported file extension: .${nameExt}. Allowed: .pdf, .docx, .txt`);
  }
  if (nameExt !== mimeExt) {
    throw new Error('File extension does not match its content type');
  }

  return mimeExt;
}

export async function parseFileBuffer(buffer, mimetype) {
  const ext = ALLOWED_MIMES[mimetype];
  if (!ext) {
    throw new Error(`Unsupported file type: ${mimetype}`);
  }

  switch (ext) {
    case 'pdf':
      return parsePdf(buffer);
    case 'docx':
      return parseDocx(buffer);
    case 'txt':
      return parseTxt(buffer);
    default:
      throw new Error(`Unsupported format: ${ext}`);
  }
}

async function parsePdf(buffer) {
  try {
    const data = await pdfParse(buffer);
    return cleanText(data.text);
  } catch (err) {
    throw new Error(`Failed to parse PDF: ${err.message}`);
  }
}

async function parseDocx(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return cleanText(result.value);
  } catch (err) {
    throw new Error(`Failed to parse DOCX: ${err.message}`);
  }
}

function parseTxt(buffer) {
  return cleanText(buffer.toString('utf-8'));
}

export function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/gm, '')
    .trim();
}

export function validateTextInput(text, label = 'Text') {
  const cleaned = cleanText(text);
  if (!cleaned || cleaned.length < 50) {
    throw new Error(`${label} must be at least 50 characters`);
  }
  if (cleaned.length > 100000) {
    throw new Error(`${label} exceeds maximum length`);
  }
  return cleaned;
}
