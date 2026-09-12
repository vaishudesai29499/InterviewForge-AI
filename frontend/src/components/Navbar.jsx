import { Sparkles } from 'lucide-react';

export default function Navbar({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'upload', label: 'Upload & Parse' },
    { id: 'analysis', label: 'Gap Analysis' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-purple-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">InterviewForge AI</h1>
            <p className="text-xs text-slate-400">Resume-JD Score & Gap Analysis</p>
          </div>
        </div>

        <nav className="flex gap-1 rounded-lg bg-slate-900 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
