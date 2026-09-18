import { CheckCircle2, Loader2, Cpu } from 'lucide-react';

export default function OptimizationProgressModal({ stage, isOpen }) {
  if (!isOpen) return null;

  const stages = [
    { id: 1, label: 'Stage 1: Understanding operator instructions' },
    { id: 2, label: 'Stage 2: Validating directives (Zod guardrails)' },
    { id: 3, label: 'Stage 3: Applying energy & battery constraints' },
    { id: 4, label: 'Stage 4: Optimizing 24-hour dispatch schedule' },
    { id: 5, label: 'Stage 5: Validating optimized result & metrics' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-7 max-w-md w-full shadow-2xl shadow-cyan-500/10">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">GridWise Optimizer Engine</h3>
            <p className="text-xs text-slate-400">Executing mathematical dispatch optimization...</p>
          </div>
        </div>

        <div className="space-y-3.5 my-6">
          {stages.map((s) => {
            const isDone = stage > s.id;
            const isCurrent = stage === s.id;
            const isPending = stage < s.id;

            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs transition-all ${
                  isDone
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : isCurrent
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-200 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
                }`}
              >
                {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                {isCurrent && <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />}
                {isPending && <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />}
                <span className={`font-medium ${isCurrent ? 'font-bold text-white' : ''}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-2">
          <span className="text-[11px] font-mono text-slate-400">
            {stage >= 5 ? 'Finalizing schedule and PostgreSQL sync...' : 'Processing constraint matrices...'}
          </span>
        </div>
      </div>
    </div>
  );
}
