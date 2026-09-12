import { Target, AlertTriangle, CheckCircle2 } from 'lucide-react';

function ScoreRing({ score, label, size = 120 }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold">{score}%</span>
        </div>
      </div>
      <span className="mt-2 text-sm text-slate-400">{label}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card animate-pulse p-6">
      <div className="h-4 w-1/3 rounded bg-slate-700" />
      <div className="mt-4 h-3 w-full rounded bg-slate-700" />
      <div className="mt-2 h-3 w-2/3 rounded bg-slate-700" />
    </div>
  );
}

export default function AnalysisDashboard({ analysis, loading }) {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="card flex flex-col items-center justify-center p-12 text-center">
        <Target className="mb-4 h-12 w-12 text-slate-600" />
        <h3 className="text-lg font-semibold text-slate-300">No Analysis Yet</h3>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Upload your resume and job description in the Upload tab to generate a match score and gap analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Gap Analysis Dashboard</h2>
        <p className="mt-2 text-slate-400">{analysis.summary}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card relative flex items-center justify-center p-8">
          <div className="relative">
            <ScoreRing score={analysis.matchScore} label="Match Score" />
          </div>
        </div>
        <div className="card relative flex items-center justify-center p-8">
          <div className="relative">
            <ScoreRing score={analysis.experienceRelevancyScore} label="Experience Relevancy" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <h3 className="font-semibold">Matching Skills</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.matchingSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="mb-4 flex items-center gap-2 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">Skill Gaps</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.missingSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-amber-500/10 px-3 py-1 text-sm text-amber-300"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
