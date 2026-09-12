import { useRef, useState } from 'react';
import { Upload, FileText, Loader2, X } from 'lucide-react';

const ACCEPT = '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain';
const MAX_SIZE = 5 * 1024 * 1024;

function FileDropZone({ label, file, onFileChange, text, onTextChange, placeholder }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f) => {
    if (!f) return;
    if (f.size > MAX_SIZE) {
      onFileChange(null, 'File exceeds 5MB limit');
      return;
    }
    onFileChange(f, null);
  };

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-200">{label}</h3>
        {file && (
          <button
            onClick={() => onFileChange(null, null)}
            className="text-slate-400 hover:text-red-400"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mb-4 cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition ${
          dragOver
            ? 'border-brand-500 bg-brand-500/10'
            : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {file ? (
          <div className="flex items-center justify-center gap-2 text-brand-400">
            <FileText className="h-5 w-5" />
            <span className="text-sm font-medium">{file.name}</span>
            <span className="text-xs text-slate-500">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        ) : (
          <>
            <Upload className="mx-auto mb-2 h-8 w-8 text-slate-500" />
            <p className="text-sm text-slate-400">Drop PDF, DOCX, or TXT here</p>
            <p className="mt-1 text-xs text-slate-500">Max 5MB</p>
          </>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-700" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-slate-900 px-2 text-slate-500">or paste text</span>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className="input-field mt-3 resize-none"
      />
    </div>
  );
}

export default function FileUploadSection({
  resumeFile,
  jdFile,
  resumeText,
  jdText,
  onResumeFileChange,
  onJdFileChange,
  onResumeTextChange,
  onJdTextChange,
  onUploadAndAnalyze,
  loading,
}) {
  const canSubmit =
    (resumeFile || resumeText.trim().length >= 50) &&
    (jdFile || jdText.trim().length >= 50);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Upload Your Documents</h2>
        <p className="mt-2 text-slate-400">
          Upload or paste your Resume and Job Description for AI-powered gap analysis
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FileDropZone
          label="Resume"
          file={resumeFile}
          onFileChange={onResumeFileChange}
          text={resumeText}
          onTextChange={onResumeTextChange}
          placeholder="Paste your resume text here..."
        />
        <FileDropZone
          label="Job Description"
          file={jdFile}
          onFileChange={onJdFileChange}
          text={jdText}
          onTextChange={onJdTextChange}
          placeholder="Paste the job description here..."
        />
      </div>

      <div className="flex justify-center">
        <button
          onClick={onUploadAndAnalyze}
          disabled={!canSubmit || loading}
          className="btn-primary min-w-[200px] py-3"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload & Analyze
            </>
          )}
        </button>
      </div>
    </div>
  );
}
