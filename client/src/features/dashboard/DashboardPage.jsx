import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Zap,
  TrendingDown,
  Battery,
  DollarSign,
  Sun,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PATHS } from '../../router/routes';
import { useEnergyStore } from '../../store/useEnergyStore';
import MetricCard from '../../shared/components/MetricCard';
import EnergyFlow from '../../shared/components/EnergyFlow';
import BatteryMeter from '../../shared/components/BatteryMeter';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { optimizationResult, loadPreset, hours, battery, operatorNotes } = useEnergyStore();
  const [dbLatest, setDbLatest] = useState(null);

  useEffect(() => {
    if (!optimizationResult) {
      import('../../api/energy.api').then(({ getAnalytics }) => {
        getAnalytics()
          .then((res) => {
            const plan = res?.data?.analytics?.latest_plan;
            if (plan && plan.hourly_plan) {
              setDbLatest({
                scenario_name: plan.scenario_name || plan.scenario_id,
                total_grid_kwh: Number(plan.total_grid || 0),
                total_cost_bdt: Number(plan.total_cost || 0),
                peak_grid_kwh: Number(plan.peak_grid || 0),
                hourly_plan: plan.hourly_plan,
                directive_interpretation: { directives: [] },
              });
            }
          })
          .catch(() => {});
      });
    }
  }, [optimizationResult]);

  const result = optimizationResult || dbLatest;

  const handleQuickDemo = () => {
    loadPreset('normal');
    navigate(PATHS.ENERGY_INPUT);
  };

  // Metrics from real optimization or scenario defaults
  const totalGrid = result ? result.total_grid_kwh : hours.reduce((s, h) => s + Math.max(0, h.demand - h.solar), 0);
  const totalCost = result ? result.total_cost_bdt : hours.reduce((s, h) => s + Math.max(0, h.demand - h.solar) * h.tariff, 0);
  const peakGrid = result ? result.peak_grid_kwh : Math.max(...hours.map((h) => Math.max(0, h.demand - h.solar)));
  const batteryPct = result
    ? Math.round(((result.battery?.initial_energy ?? battery.initial_energy) / (result.battery?.capacity ?? battery.capacity)) * 100)
    : Math.round((battery.initial_energy / battery.capacity) * 100);

  // Hourly plan for charts
  const chartData = result?.hourly_plan || hours.map((h) => ({
    hour: h.hour,
    demand_kwh: h.demand,
    solar_kwh: h.solar,
    solar_used_kwh: Math.min(h.demand, h.solar),
    grid_kwh: Math.max(0, h.demand - h.solar),
    charge_kwh: 0,
    discharge_kwh: 0,
    battery_energy_kwh: battery.initial_energy,
    tariff_bdt_per_kwh: h.tariff,
    cost_bdt: Math.max(0, h.demand - h.solar) * h.tariff,
    battery_action: 'idle',
  }));

  const directives = result?.directive_interpretation?.directives || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Dashboard Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950 p-6 rounded-3xl border border-slate-800/80 shadow-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono uppercase font-bold tracking-widest">
              Live Operations
            </span>
            {result && (
              <span className="text-xs text-slate-400 font-mono">
                Scenario: <code className="text-slate-200">{result.scenario_name}</code>
              </span>
            )}
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Energy Intelligence Dashboard
          </h1>
          <p className="text-xs lg:text-sm text-slate-400 mt-1 max-w-xl">
            Monitor, optimize and understand your energy operations with AI-interpreted constraints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleQuickDemo}
            className="px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700/80 transition-all flex items-center gap-2 shadow-lg"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Load Demo Scenario
          </button>
          <Link
            to={PATHS.ENERGY_INPUT}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2"
          >
            <Zap className="w-4 h-4 fill-slate-950" />
            Optimize Energy
          </Link>
        </div>
      </div>

      {/* 4 Large Premium KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <MetricCard
          icon={Zap}
          label="Total Grid Consumption"
          value={totalGrid.toFixed(1)}
          unit="kWh"
          subtitle={
            result?.baseline?.grid_reduction_pct
              ? `Saved ${result.baseline.grid_reduction_pct}% vs baseline`
              : '24-hour total grid draw'
          }
          accent="sky"
          badge="Grid"
        />

        <MetricCard
          icon={DollarSign}
          label="Total Energy Cost"
          value={`৳ ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          unit=""
          subtitle={
            result?.baseline?.cost_savings_pct
              ? `Saved ৳ ${result.baseline.cost_savings_bdt} (${result.baseline.cost_savings_pct}%)`
              : 'Estimated daily cost'
          }
          accent="emerald"
          badge="BDT"
        />

        <MetricCard
          icon={TrendingDown}
          label="Peak Grid Demand"
          value={peakGrid.toFixed(1)}
          unit="kW"
          subtitle={
            result?.baseline?.peak_reduction_pct
              ? `Peak cut by ${result.baseline.peak_reduction_pct}%`
              : 'Maximum hourly spike'
          }
          accent="amber"
          badge="Peak"
        />

        <MetricCard
          icon={Battery}
          label="Battery State of Charge"
          value={`${batteryPct}%`}
          unit=""
          subtitle={`${battery.capacity} kWh storage bank`}
          accent="indigo"
          badge="BESS"
        />
      </div>

      {/* Live Energy Flow Visualization */}
      <EnergyFlow hourlyPlan={chartData} />

      {/* 24-Hour Energy Overview Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              24-Hour Energy Overview
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hourly comparison of facility demand, solar generation, and grid import
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-emerald-400" /> Demand
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-amber-400" /> Solar
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded-full bg-sky-400" /> Grid Import
            </span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" tickFormatter={(h) => `${String(h).padStart(2, '0')}:00`} stroke="#64748b" textAnchor="end" />
              <YAxis unit=" kW" stroke="#64748b" />
              <Tooltip
                contentStyle={{ background: '#0d1526', borderColor: '#1e293b', borderRadius: '16px' }}
                formatter={(val, name) => [`${Number(val).toFixed(1)} kW`, name]}
                labelFormatter={(h) => `Hour ${String(h).padStart(2, '0')}:00`}
              />
              <Area type="monotone" dataKey="demand_kwh" stroke="#34d399" strokeWidth={2.5} fill="url(#demandGrad)" name="Demand" />
              <Area type="monotone" dataKey="solar_kwh" stroke="#fbbf24" strokeWidth={2} fill="url(#solarGrad)" name="Solar Available" />
              <Area type="monotone" dataKey="grid_kwh" stroke="#38bdf8" strokeWidth={2} fill="url(#gridGrad)" name="Grid Import" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two-Column Supporting Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Battery State Card */}
        <BatteryMeter
          capacity={battery.capacity}
          currentEnergy={result ? result.hourly_plan[12]?.battery_energy_kwh ?? battery.initial_energy : battery.initial_energy}
          minReserve={battery.min_reserve}
          totalCharged={result?.total_charged_kwh || 0}
          totalDischarged={result?.total_discharged_kwh || 0}
        />

        {/* Hourly Tariff Bar Chart */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Hourly Electricity Tariff
              </h3>
              <span className="text-xs font-mono text-slate-400">BDT / kWh</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Higher tariffs trigger battery discharge arbitrage to minimize energy procurement cost.
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}`} stroke="#64748b" />
                <YAxis stroke="#64748b" unit=" ৳" />
                <Tooltip
                  contentStyle={{ background: '#0d1526', borderColor: '#1e293b', borderRadius: '12px' }}
                  formatter={(val) => [`৳ ${Number(val).toFixed(2)} / kWh`, 'Tariff']}
                  labelFormatter={(h) => `Hour ${String(h).padStart(2, '0')}:00`}
                />
                <Bar dataKey="tariff_bdt_per_kwh" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Tariff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Operator Directives Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">AI Operator Directives</h3>
              <p className="text-xs text-slate-400">Natural language notes parsed into structured dispatch constraints</p>
            </div>
          </div>
          <Link
            to={PATHS.ENERGY_INPUT}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            Edit Notes <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {directives.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {directives.map((d, i) => (
              <div
                key={i}
                className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[11px] font-bold uppercase">
                      {d.directive_type.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        d.applies
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {d.applies ? '✓ Applied' : 'Not Applicable'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 italic font-serif">"{operatorNotes[d.note_index] || 'Instruction'}"</p>
                </div>
                <p className="text-[11px] text-slate-400 border-t border-slate-900 pt-2">{d.explanation}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">
            <p>No active directives. Load a demo scenario to see AI directive interpretation in action.</p>
            <button
              onClick={handleQuickDemo}
              className="mt-3 px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Load Demo Notes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
