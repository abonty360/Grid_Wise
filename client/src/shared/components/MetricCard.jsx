export default function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  subtitle,
  accent = 'emerald',
  badge,
}) {
  const accentColors = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 group-hover:border-emerald-500/40',
    sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20 group-hover:border-sky-500/40',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20 group-hover:border-amber-500/40',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 group-hover:border-indigo-500/40',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20 group-hover:border-rose-500/40',
  };

  const textColors = {
    emerald: 'text-emerald-400',
    sky: 'text-sky-400',
    amber: 'text-amber-400',
    indigo: 'text-indigo-400',
    rose: 'text-rose-400',
  };

  return (
    <div className="group bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/10 to-transparent blur-xl pointer-events-none" />

      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-xl border transition-all ${accentColors[accent] || accentColors.emerald}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span className={`text-2xl lg:text-3xl font-black font-mono tracking-tight ${textColors[accent] || 'text-white'}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-slate-400 font-medium">{unit}</span>}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-xs">
        <span className="text-slate-400 truncate">{subtitle}</span>
        {badge && (
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono text-slate-300 font-semibold shrink-0">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
