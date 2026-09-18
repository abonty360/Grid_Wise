import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Search, ExternalLink, Filter } from 'lucide-react';
import { PATHS } from '../../router/routes';
import { getHistory } from '../../api/energy.api';

export default function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getHistory()
      .then((res) => setHistory(res?.data?.history || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = history.filter(
    (h) =>
      h.scenario_name?.toLowerCase().includes(search.toLowerCase()) ||
      h.scenario_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase text-emerald-400 font-bold tracking-wider block mb-1">
            Audit & Dispatch Log
          </span>
          <h1 className="text-2xl font-black text-white">Optimization History</h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical record of all 24-hour mathematical optimizations computed by GridWise.
          </p>
        </div>

        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search optimizations..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:border-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
        {loading ? (
          <div className="py-12 text-center text-slate-400 font-mono text-xs">
            Querying optimization logs from database...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p>No optimization runs recorded yet.</p>
            <button
              onClick={() => navigate(PATHS.ENERGY_INPUT)}
              className="mt-3 px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Run First Optimization
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Scenario</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Total Grid</th>
                  <th className="py-3 px-4">Peak Demand</th>
                  <th className="py-3 px-4">Total Cost</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(PATHS.ENERGY_RESULT.replace(':scenarioId', item.scenario_id))}
                    className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-white">
                      {item.scenario_name || item.scenario_id}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(item.optimized_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sky-400">
                      {Number(item.total_grid || 0).toFixed(1)} kWh
                    </td>
                    <td className="py-3 px-4 text-amber-400">
                      {Number(item.peak_grid || 0).toFixed(1)} kW
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      ৳ {Number(item.total_cost || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                        {item.status || 'success'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <ExternalLink className="w-4 h-4 text-slate-500 hover:text-white inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
