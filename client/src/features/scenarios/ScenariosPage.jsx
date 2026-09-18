import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FolderGit2,
  Plus,
  Play,
  Copy,
  Trash2,
  Sparkles,
  Search,
  ExternalLink,
} from 'lucide-react';
import { PATHS } from '../../router/routes';
import { useEnergyStore, DEMO_PRESETS } from '../../store/useEnergyStore';
import { getScenarios, deleteScenario } from '../../api/energy.api';

export default function ScenariosPage() {
  const navigate = useNavigate();
  const { loadPreset, setScenarioName, setHours, setBattery, setOperatorNotes } = useEnergyStore();

  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchScenarios = async () => {
    setLoading(true);
    try {
      const res = await getScenarios();
      setScenarios(res?.data?.scenarios || []);
    } catch {
      // If none, fallback gracefully
      setScenarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  const handleLaunchPreset = (key) => {
    loadPreset(key);
    toast.success(`Loaded preset: ${DEMO_PRESETS[key].name}`);
    navigate(PATHS.ENERGY_INPUT);
  };

  const handleOpenScenario = (s) => {
    setScenarioName(s.name || 'Saved Scenario');
    if (s.hours_data) setHours(s.hours_data);
    if (s.battery_capacity_kwh) {
      setBattery({
        capacity: Number(s.battery_capacity_kwh),
        initial_energy: Number(s.battery_current_charge_kwh),
        min_reserve: 0,
        max_charge: Number(s.battery_max_charge_rate_kw),
        max_discharge: Number(s.battery_max_discharge_rate_kw),
      });
    }
    navigate(PATHS.ENERGY_INPUT);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this scenario?')) return;
    try {
      await deleteScenario(id);
      toast.success('Scenario deleted.');
      fetchScenarios();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = scenarios.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.scenario_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase text-emerald-400 font-bold tracking-wider block mb-1">
            Database Library
          </span>
          <h1 className="text-2xl font-black text-white">Energy Scenarios</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage, duplicate, and test facility scenarios saved in Neon PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleLaunchPreset('normal')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Demo Presets
          </button>
          <button
            onClick={() => navigate(PATHS.ENERGY_INPUT)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" /> Create Scenario
          </button>
        </div>
      </div>

      {/* Preset Cards Quick Launcher */}
      <div>
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
          Quick-Launch Demo Scenarios
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(DEMO_PRESETS).map(([key, p]) => (
            <div
              key={key}
              onClick={() => handleLaunchPreset(key)}
              className="p-5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-all duration-200 shadow-md group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {p.name}
                  </span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{p.description}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                <span>Cap: {p.battery.capacity} kWh</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Load <Play className="w-3 h-3 fill-emerald-400" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Saved Scenarios Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-cyan-400" />
            Saved Scenarios in PostgreSQL ({scenarios.length})
          </h2>

          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scenarios..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:border-emerald-500 outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 font-mono text-xs">
            Querying Neon PostgreSQL...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            <FolderGit2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p>No saved scenarios found in the database.</p>
            <button
              onClick={() => handleLaunchPreset('normal')}
              className="mt-3 px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
            >
              Load Demo Scenario
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Scenario ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Battery</th>
                  <th className="py-3 px-4">Last Cost</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filtered.map((s) => (
                  <tr
                    key={s.id || s.scenario_id}
                    onClick={() => handleOpenScenario(s)}
                    className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-white">{s.name || 'Untitled'}</td>
                    <td className="py-3 px-4 text-slate-400">{s.scenario_id}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                        {s.status || 'draft'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{s.battery_capacity_kwh} kWh</td>
                    <td className="py-3 px-4 text-emerald-400">
                      {s.total_cost ? `৳ ${Number(s.total_cost).toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenScenario(s);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                          title="Open & Optimize"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(s.scenario_id, e)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
