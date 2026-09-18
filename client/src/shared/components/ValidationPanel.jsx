import { CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function ValidationPanel({ validation }) {
  if (!validation || !validation.checks) {
    return null;
  }

  const { checks, all_pass } = validation;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-5 h-5 ${all_pass ? 'text-emerald-400' : 'text-amber-400'}`} />
          <h3 className="text-base font-bold text-white">
            System Constraint & Mathematical Verification
          </h3>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider ${
            all_pass
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          }`}
        >
          {all_pass ? 'All 13 Checks Passed' : 'Warning Detected'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {checks.map((c, i) => {
          const pass = c.status === 'pass';
          return (
            <div
              key={i}
              className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs transition-all ${
                pass
                  ? 'bg-slate-950/40 border-slate-800/80 text-slate-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              {pass ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span>{c.check}</span>
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                      pass ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <p className="text-slate-400 mt-0.5 text-[11px] leading-relaxed">{c.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
