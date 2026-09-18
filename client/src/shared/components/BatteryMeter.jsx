import { Battery, BatteryCharging, Zap } from 'lucide-react';

export default function BatteryMeter({
  capacity = 100,
  currentEnergy = 50,
  minReserve = 20,
  action = 'idle',
  totalCharged = 0,
  totalDischarged = 0,
}) {
  const percentage = Math.round((currentEnergy / (capacity || 1)) * 100);
  const reservePct = Math.round((minReserve / (capacity || 1)) * 100);

  return (
    <div className="card bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Battery className="w-5 h-5 text-emerald-400" />
          Battery State of Charge
        </h3>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${
            action === 'charge'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : action === 'discharge'
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          {action === 'charge' && <BatteryCharging className="w-3.5 h-3.5 animate-pulse" />}
          {action === 'discharge' && <Zap className="w-3.5 h-3.5" />}
          {action}
        </span>
      </div>

      {/* Large Gauge Display */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-4xl font-extrabold text-white font-mono tracking-tight">
          {percentage}%
        </span>
        <span className="text-sm text-slate-400 font-mono">
          ({currentEnergy.toFixed(1)} / {capacity} kWh)
        </span>
      </div>

      {/* Progress Bar with Reserve Marker */}
      <div className="relative w-full h-5 bg-slate-950 rounded-full border border-slate-800 overflow-hidden p-0.5 mb-6">
        <div
          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-md shadow-emerald-500/30"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
        {/* Minimum reserve indicator line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `${reservePct}%` }}
          title={`Min Reserve: ${minReserve} kWh (${reservePct}%)`}
        />
      </div>

      {/* Stats Breakdown Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-slate-400 block mb-1">Capacity</span>
          <span className="font-mono font-bold text-slate-200 text-sm">{capacity} kWh</span>
        </div>
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-slate-400 block mb-1">Min Reserve</span>
          <span className="font-mono font-bold text-amber-400 text-sm">{minReserve} kWh</span>
        </div>
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-slate-400 block mb-1">Total Charged</span>
          <span className="font-mono font-bold text-emerald-400 text-sm">+{totalCharged.toFixed(1)} kWh</span>
        </div>
        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-slate-400 block mb-1">Total Discharged</span>
          <span className="font-mono font-bold text-indigo-400 text-sm">-{totalDischarged.toFixed(1)} kWh</span>
        </div>
      </div>
    </div>
  );
}
