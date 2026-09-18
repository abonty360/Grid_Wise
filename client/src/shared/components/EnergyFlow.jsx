import { useState } from 'react';
import { Sun, Zap, Battery, Home, ArrowRight, ArrowDown } from 'lucide-react';

export default function EnergyFlow({ hourlyPlan }) {
  const [selectedHour, setSelectedHour] = useState(12);

  if (!hourlyPlan || hourlyPlan.length === 0) {
    return (
      <div className="card p-6 text-center text-slate-400">
        <p>No schedule loaded for energy flow visualization.</p>
      </div>
    );
  }

  const current = hourlyPlan[selectedHour] || hourlyPlan[0];

  const solar = Number(current.solar_kwh || 0);
  const solarUsed = Number(current.solar_used_kwh || 0);
  const grid = Number(current.grid_kwh || 0);
  const charge = Number(current.charge_kwh || 0);
  const discharge = Number(current.discharge_kwh || 0);
  const demand = Number(current.demand_kwh || 0);
  const batteryEnergy = Number(current.battery_energy_kwh || 0);
  const action = current.battery_action || 'idle';

  return (
    <div className="card bg-slate-900/80 border border-cyan-500/20 rounded-2xl p-6 shadow-xl backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            Live Energy Flow Matrix
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic load distribution at{' '}
            <span className="text-emerald-400 font-semibold">{String(selectedHour).padStart(2, '0')}:00</span>
          </p>
        </div>

        {/* Hour Scrub Slider */}
        <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800">
          <span className="text-xs font-mono text-slate-400">00:00</span>
          <input
            type="range"
            min="0"
            max="23"
            value={selectedHour}
            onChange={(e) => setSelectedHour(Number(e.target.value))}
            className="w-36 accent-emerald-400 cursor-pointer"
          />
          <span className="text-xs font-mono text-slate-400">23:00</span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
            {String(selectedHour).padStart(2, '0')}:00
          </span>
        </div>
      </div>

      {/* Energy Flow Diagram */}
      <div className="grid grid-cols-3 gap-6 items-center max-w-2xl mx-auto py-4">
        {/* Top Center: SOLAR */}
        <div className="col-start-2 flex flex-col items-center">
          <div className={`p-4 rounded-2xl border transition-all ${solarUsed > 0 ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/20 animate-pulse' : 'bg-slate-950 border-slate-800'}`}>
            <Sun className={`w-8 h-8 ${solarUsed > 0 ? 'text-amber-400' : 'text-slate-600'}`} />
          </div>
          <span className="text-xs font-semibold text-slate-300 mt-2">SOLAR</span>
          <span className="text-sm font-mono font-bold text-amber-400">{solarUsed.toFixed(1)} kW</span>
          <span className="text-[10px] text-slate-500">Avail: {solar.toFixed(1)} kW</span>
          {solarUsed > 0 && <ArrowDown className="w-4 h-4 text-amber-400 my-1 animate-bounce" />}
        </div>

        {/* Left: GRID */}
        <div className="col-start-1 row-start-2 flex flex-col items-center">
          <div className={`p-4 rounded-2xl border transition-all ${grid > 0 ? 'bg-sky-500/10 border-sky-500/40 shadow-lg shadow-sky-500/20' : 'bg-slate-950 border-slate-800'}`}>
            <Zap className={`w-8 h-8 ${grid > 0 ? 'text-sky-400' : 'text-slate-600'}`} />
          </div>
          <span className="text-xs font-semibold text-slate-300 mt-2">GRID</span>
          <span className="text-sm font-mono font-bold text-sky-400">{grid.toFixed(1)} kW</span>
          <span className="text-[10px] text-slate-500">{current.tariff_bdt_per_kwh} ৳/kWh</span>
        </div>

        {/* Center: ENERGY ROUTER / LOAD */}
        <div className="col-start-2 row-start-2 flex flex-col items-center">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border-2 border-emerald-500/50 shadow-2xl shadow-emerald-500/20 relative">
            <Home className="w-9 h-9 text-emerald-400" />
            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[9px] font-black uppercase tracking-wider">
              Load
            </span>
          </div>
          <span className="text-xs font-semibold text-white mt-2">FACILITY DEMAND</span>
          <span className="text-base font-mono font-extrabold text-emerald-400">{demand.toFixed(1)} kW</span>
        </div>

        {/* Right: BATTERY */}
        <div className="col-start-3 row-start-2 flex flex-col items-center">
          <div className={`p-4 rounded-2xl border transition-all ${action === 'discharge' ? 'bg-indigo-500/20 border-indigo-500/50 shadow-lg shadow-indigo-500/30' : action === 'charge' ? 'bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/30' : 'bg-slate-950 border-slate-800'}`}>
            <Battery className={`w-8 h-8 ${action === 'discharge' ? 'text-indigo-400' : action === 'charge' ? 'text-emerald-400' : 'text-slate-500'}`} />
          </div>
          <span className="text-xs font-semibold text-slate-300 mt-2">BATTERY</span>
          <span className="text-sm font-mono font-bold text-slate-200">{batteryEnergy.toFixed(1)} kWh</span>
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded mt-1 ${action === 'charge' ? 'bg-emerald-500/20 text-emerald-400' : action === 'discharge' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
            {action === 'charge' ? `+${charge.toFixed(1)} kW` : action === 'discharge' ? `-${discharge.toFixed(1)} kW` : 'IDLE'}
          </span>
        </div>
      </div>

      {/* Summary Chips Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-800/80 text-xs">
        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 block">Solar to Load</span>
          <span className="font-mono font-bold text-amber-400">{solarUsed.toFixed(1)} kW</span>
        </div>
        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 block">Grid Import</span>
          <span className="font-mono font-bold text-sky-400">{grid.toFixed(1)} kW</span>
        </div>
        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 block">Battery Discharge</span>
          <span className="font-mono font-bold text-indigo-400">{discharge.toFixed(1)} kW</span>
        </div>
        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
          <span className="text-slate-400 block">Hourly Cost</span>
          <span className="font-mono font-bold text-emerald-400">৳ {current.cost_bdt?.toFixed(2) || '0.00'}</span>
        </div>
      </div>
    </div>
  );
}
