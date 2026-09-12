import { useState, useCallback } from 'react';

const initialState = {
  resumeText: '',
  jdText: '',
  resumeFile: null,
  jdFile: null,
  analysisId: null,
  analysis: null,
  activeTab: 'upload',
};

export function useInterviewState() {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setResumeText = useCallback((text) => updateState({ resumeText: text }), [updateState]);
  const setJdText = useCallback((text) => updateState({ jdText: text }), [updateState]);
  const setResumeFile = useCallback((file) => updateState({ resumeFile: file }), [updateState]);
  const setJdFile = useCallback((file) => updateState({ jdFile: file }), [updateState]);
  const setAnalysisId = useCallback((analysisId) => updateState({ analysisId }), [updateState]);
  const setAnalysis = useCallback((analysis) => updateState({ analysis }), [updateState]);
  const setActiveTab = useCallback((tab) => updateState({ activeTab: tab }), [updateState]);

  const resetAll = useCallback(() => {
    setState(initialState);
    setError(null);
    setLoading(false);
  }, []);

  return {
    state,
    loading,
    setLoading,
    error,
    setError,
    updateState,
    setResumeText,
    setJdText,
    setResumeFile,
    setJdFile,
    setAnalysisId,
    setAnalysis,
    setActiveTab,
    resetAll,
  };
}
