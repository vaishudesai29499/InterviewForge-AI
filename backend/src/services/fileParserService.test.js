import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateFile, validateTextInput } from './fileParserService.js';

function makeFile({ mimetype, originalname, size = 1000 }) {
  return { mimetype, originalname, size };
}

test('file validation: PDF accepted', () => {
  const ext = validateFile(makeFile({ mimetype: 'application/pdf', originalname: 'resume.pdf' }));
  assert.equal(ext, 'pdf');
});

test('file validation: DOCX accepted', () => {
  const ext = validateFile(
    makeFile({
      mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      originalname: 'resume.docx',
    })
  );
  assert.equal(ext, 'docx');
});

test('file validation: TXT accepted', () => {
  const ext = validateFile(makeFile({ mimetype: 'text/plain', originalname: 'resume.txt' }));
  assert.equal(ext, 'txt');
});

test('file validation: unsupported type rejected', () => {
  assert.throws(() => validateFile(makeFile({ mimetype: 'image/png', originalname: 'resume.png' })));
});

test('file validation: extension/MIME mismatch rejected (do not trust MIME alone)', () => {
  assert.throws(() => validateFile(makeFile({ mimetype: 'application/pdf', originalname: 'resume.docx' })));
});

test('file validation: >5MB rejected', () => {
  assert.throws(() =>
    validateFile(makeFile({ mimetype: 'application/pdf', originalname: 'resume.pdf', size: 6 * 1024 * 1024 }))
  );
});

test('text input validation: rejects too-short text', () => {
  assert.throws(() => validateTextInput('too short', 'Resume'));
});

test('text input validation: accepts reasonable text and cleans whitespace', () => {
  const input = 'A'.repeat(60) + '\r\n\r\n\r\nextra\t\ttabs';
  const result = validateTextInput(input, 'Resume');
  assert.ok(result.length > 0);
  assert.ok(!result.includes('\r'));
});
