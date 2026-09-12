import { useCallback, useState } from 'react';
import { Trash2, ShieldCheck } from 'lucide-react';
import Navbar from './components/Navbar';
import FileUploadSection from './components/FileUploadSection';
import AnalysisDashboard from './components/AnalysisDashboard';
import ToastContainer, { showToast } from './components/Toast';
import { useInterviewState } from './hooks/useInterviewState';
import { uploadDocuments, createAnalysis, deleteAnalysis } from './services/api';

const STAGES = [
  'Uploading & parsing documents...',
  'Analyzing skills and experience...',
  'Finalizing your report...',
];

export default function App() {
  const {
    state,
    loading,
    setLoading,
    setResumeText,
    setJdText,
    setResumeFile,
    setJdFile,
    setAnalysisId,
    setAnalysis,
    setActiveTab,
    resetAll,
  } = useInterviewState();

  const [stageIndex, setStageIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const handleResumeFileChange = useCallback(
    (file, errMsg) => {
      if (errMsg) showToast(errMsg, 'error');
      setResumeFile(file);
    },
    [setResumeFile]
  );

  const handleJdFileChange = useCallback(
    (file, errMsg) => {
      if (errMsg) showToast(errMsg, 'error');
      setJdFile(file);
    },
    [setJdFile]
  );

  const handleUploadAndAnalyze = useCallback(async () => {
    setLoading(true);
    setStageIndex(0);
    try {
      const uploadResult = await uploadDocuments({
        resumeFile: state.resumeFile,
        jdFile: state.jdFile,
        resumeText: state.resumeText,
        jdText: state.jdText,
      });
      const { resumeText, jdText } = uploadResult.data;
      setResumeText(resumeText);
      setJdText(jdText);

      setStageIndex(1);
      const analysisResult = await createAnalysis(resumeText, jdText);
      const analysisId = analysisResult.data.id;
      setAnalysisId(analysisId);

      setStageIndex(2);
      setAnalysis(analysisResult.data.analysis);
      setActiveTab('analysis');
      showToast('Analysis complete!', 'success');
    } catch (err) {
      const msg =
        err.status === 429
          ? 'Rate limit reached. Please wait a moment and try again.'
          : err.status === 503
          ? 'AI provider is not configured on the server. Set GEMINI_API_KEY in backend/.env.'
          : err.message || 'Something went wrong';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [
    state.resumeFile,
    state.jdFile,
    state.resumeText,
    state.jdText,
    setLoading,
    setResumeText,
    setJdText,
    setAnalysisId,
    setAnalysis,
    setActiveTab,
  ]);

  const handleDeleteAnalysis = useCallback(async () => {
    if (!state.analysisId) return;
    if (!window.confirm('Delete this analysis? This will permanently remove your temporary resume/JD analysis.')) {
      return;
    }
    setDeleting(true);
    try {
      await deleteAnalysis(state.analysisId);
      resetAll();
      showToast('Analysis deleted.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete analysis', 'error');
    } finally {
      setDeleting(false);
    }
  }, [state.analysisId, resetAll]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Navbar activeTab={state.activeTab} onTabChange={setActiveTab} />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {state.activeTab === 'upload' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>No Signup · No Password · No Account Required — your analysis is temporary and is automatically deleted after 24 hours.</span>
            </div>
            <FileUploadSection
              resumeFile={state.resumeFile}
              jdFile={state.jdFile}
              resumeText={state.resumeText}
              jdText={state.jdText}
              onResumeFileChange={handleResumeFileChange}
              onJdFileChange={handleJdFileChange}
              onResumeTextChange={setResumeText}
              onJdTextChange={setJdText}
              onUploadAndAnalyze={handleUploadAndAnalyze}
              loading={loading}
            />
            {loading && (
              <p className="text-center text-sm text-slate-400">{STAGES[stageIndex]}</p>
            )}
          </div>
        )}

        {state.activeTab === 'analysis' && (
          <div className="space-y-4">
            <AnalysisDashboard analysis={state.analysis} loading={loading} />
            {state.analysis && (
              <div className="flex justify-center">
                <button
                  onClick={handleDeleteAnalysis}
                  disabled={deleting}
                  className="btn-secondary text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Analysis
                </button>
              </div>
            )}
          </div>
        )}
      </main>
      <ToastContainer />
    </div>
  );
}
