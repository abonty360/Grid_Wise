import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Zap,
  Sun,
  Battery,
  Calendar,
  Layers,
} from 'lucide-react';
import { getAnalytics } from '../../api/energy.api';
import MetricCard from '../../shared/components/MetricCard';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('7d');

  useEffect(() => {
    getAnalytics()
      .then((res) => setAnalytics(res?.data?.analytics || null))
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, []);

  const trends = analytics?.history_trends || [];

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase text-emerald-400 font-bold tracking-wider block mb-1">
            Executive Intelligence
          </span>
          <h1 className="text-2xl font-black text-white">Analytics & Performance Trends</h1>
          <p className="text-xs text-slate-400 mt-1">
            Aggregate operations trends, energy procurement costs, and demand reduction impacts.
          </p>
        </div>

        {/* Time Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
          {['today', '7d', '30d', 'all'].map((tab) => (
            <button
              key={tab}
              onClick={() => setTimeFilter(tab)}
              className={`px-3 py-1.5 rounded-xl font-semibold uppercase tracking-wider text-[10px] transition-all ${
                timeFilter === tab
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'today' ? 'Today' : tab === '7d' ? 'Last 7 Days' : tab === '30d' ? 'Last 30 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Aggregate KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Layers}
          label="Total Optimizations"
          value={analytics?.total_optimizations || 0}
          unit="Runs"
          subtitle="Computed by GridWise"
          accent="emerald"
        />
        <MetricCard
          icon={DollarSign}
          label="Average Energy Cost"
          value={analytics?.average_cost ? `৳ ${analytics.average_cost}` : '—'}
          subtitle="Mean daily expense"
          accent="sky"
        />
        <MetricCard
          icon={Zap}
          label="Average Grid Draw"
          value={analytics?.average_grid ? `${analytics.average_grid}` : '—'}
          unit="kWh"
          subtitle="Mean daily import"
          accent="amber"
        />
        <MetricCard
          icon={TrendingUp}
          label="Optimization Engine"
          value="Online"
          subtitle="Deterministic Dispatch"
          accent="indigo"
        />
      </div>

      {/* Historical Trend Charts */}
      {trends.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cost Trend Chart */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Optimization Cost History
            </h3>
            <p className="text-xs text-slate-400 mb-6">Total calculated expense per scenario (BDT)</p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="scenario_name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis unit=" ৳" stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ background: '#0d1526', borderColor: '#1e293b', borderRadius: '12px' }}
                    formatter={(val) => [`৳ ${Number(val).toFixed(2)}`, 'Cost']}
                  />
                  <Bar dataKey="total_cost" fill="#34d399" radius={[6, 6, 0, 0]} name="Cost (BDT)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grid vs Solar Trend Chart */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Zap className="w-5 h-5 text-sky-400" />
              Grid Draw vs Solar Utilization
            </h3>
            <p className="text-xs text-slate-400 mb-6">Comparative energy usage over recorded optimizations (kWh)</p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="scenario_name" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis unit=" kWh" stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ background: '#0d1526', borderColor: '#1e293b', borderRadius: '12px' }}
                    formatter={(val, name) => [`${Number(val).toFixed(1)} kWh`, name]}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="total_grid" stroke="#38bdf8" strokeWidth={2.5} name="Grid Import" />
                  <Line type="monotone" dataKey="solar_used" stroke="#fbbf24" strokeWidth={2} name="Solar Used" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 shadow-xl">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">Insufficient Historical Data</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No optimization records found in the database. Run optimizations from the workspace to generate analytics trends.
          </p>
        </div>
      )}
    </div>
  );
}
