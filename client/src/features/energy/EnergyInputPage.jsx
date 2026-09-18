import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Zap,
  Upload,
  RotateCcw,
  Save,
  Plus,
  Trash2,
  Sparkles,
  Sliders,
  FileSpreadsheet,
  Cpu,
} from 'lucide-react';
import { PATHS } from '../../router/routes';
import { useEnergyStore, DEMO_PRESETS } from '../../store/useEnergyStore';
import { optimizeEnergy, saveScenario } from '../../api/energy.api';
import CsvImportModal from '../../shared/components/CsvImportModal';
import OptimizationProgressModal from '../../shared/components/OptimizationProgressModal';
import BatteryMeter from '../../shared/components/BatteryMeter';

export default function EnergyInputPage() {
  const navigate = useNavigate();
  const {
    scenarioId,
    scenarioName,
    setScenarioName,
    description,
    setDescription,
    battery,
    setBattery,
    operatorNotes,
    setOperatorNotes,
    hours,
    setHours,
    loadPreset,
    resetToDefault,
    setOptimizationResult,
    activePresetKey,
  } = useEnergyStore();

  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optStage, setOptStage] = useState(1);
  const [newNoteInput, setNewNoteInput] = useState('');

  // Example directive chips
  const exampleChips = [
    'Do not charge the battery between 2 PM and 4 PM.',
    'Keep battery reserve above 30 kWh.',
    'Reduce solar availability by 20%.',
    'Limit grid usage to 60 kWh between 5 PM and 9 PM.',
    'Do not discharge the battery before 12 PM.',
  ];

  const handleAddNote = (text) => {
    const note = (text || newNoteInput).trim();
    if (!note) return;
    setOperatorNotes([...operatorNotes, note]);
    setNewNoteInput('');
  };

  const handleRemoveNote = (idx) => {
    setOperatorNotes(operatorNotes.filter((_, i) => i !== idx));
  };

  const handleCellChange = (hourIdx, field, val) => {
    const num = parseFloat(val);
    const updated = [...hours];
    updated[hourIdx] = {
      ...updated[hourIdx],
      [field]: isNaN(num) ? 0 : Math.max(0, num),
    };
    setHours(updated);
  };

  const totalDemand = hours.reduce((s, h) => s + (h.demand || 0), 0);
  const totalSolar = hours.reduce((s, h) => s + (h.solar || 0), 0);
  const avgTariff = hours.reduce((s, h) => s + (h.tariff || 0), 0) / 24;

  const handleSaveScenario = async () => {
    try {
      await saveScenario({
        scenario_id: scenarioId,
        scenario_name: scenarioName,
        description,
        battery,
        hours,
      });
      toast.success('Scenario saved to PostgreSQL database!');
    } catch (err) {
      toast.error(`Save failed: ${err.message}`);
    }
  };

  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    setOptStage(1);

    try {
      // Advance stages for real responsiveness
      setTimeout(() => setOptStage(2), 350);
      setTimeout(() => setOptStage(3), 700);
      setTimeout(() => setOptStage(4), 1100);

      const payload = {
        scenario_id: scenarioId,
        scenario_name: scenarioName,
        description,
        operator_notes: operatorNotes,
        hours,
        battery,
      };

      const result = await optimizeEnergy(payload);
      setOptStage(5);

      setTimeout(() => {
        setOptimizationResult(result);
        setIsOptimizing(false);
        toast.success('24-Hour Schedule Optimized Successfully!');
        navigate(PATHS.ENERGY_RESULT.replace(':scenarioId', result.scenario_id));
      }, 400);
    } catch (err) {
      setIsOptimizing(false);
      toast.error(`Optimization failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImportSuccess={(newHours) => {
          setHours(newHours);
          toast.success('24-Hour CSV Data applied successfully!');
        }}
      />

      <OptimizationProgressModal isOpen={isOptimizing} stage={optStage} />

      {/* Scenario Header Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-5">
          <div>
            <span className="text-xs font-mono uppercase text-emerald-400 font-bold tracking-wider block mb-1">
              Configuration Workspace
            </span>
            <h1 className="text-2xl font-black text-white">Optimize Energy</h1>
            <p className="text-xs text-slate-400 mt-1">
              Configure your energy scenario and generate an optimized 24-hour schedule.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={resetToDefault}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            <button
              onClick={handleSaveScenario}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
            >
              <Save className="w-3.5 h-3.5 text-cyan-400" /> Save Scenario
            </button>
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" /> Import CSV
            </button>
            <button
              onClick={handleRunOptimization}
              disabled={isOptimizing}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              {isOptimizing ? 'Optimizing...' : 'Optimize Energy'}
            </button>
          </div>
        </div>

        {/* Scenario Metadata Inputs & Preset Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Scenario Name</label>
            <input
              type="text"
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Commercial facility schedule"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Load Demo Preset</label>
            <select
              value={activePresetKey}
              onChange={(e) => loadPreset(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-400 focus:border-emerald-500 outline-none cursor-pointer"
            >
              <option value="normal">Normal Day</option>
              <option value="high_demand">High Demand Industrial Day</option>
              <option value="low_solar">Low Solar / Overcast Day</option>
              <option value="peak_tariff">Peak Tariff Spike Day</option>
              <option value="battery_constraint">Battery Maintenance Day</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Two-Column Grid: Config & Live Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Battery & Operator Instructions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Battery Configuration Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Battery Configuration (BESS)
              </h2>
              <span className="text-[10px] font-mono text-slate-400">Li-ion Storage</span>
            </div>

            <div className="space-y-4">
              {/* Sliders + Inputs */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 font-medium">Battery Capacity</span>
                  <span className="font-mono font-bold text-white">{battery.capacity} kWh</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="500"
                  step="5"
                  value={battery.capacity}
                  onChange={(e) => setBattery({ capacity: Number(e.target.value) })}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 font-medium">Initial Energy (SOC)</span>
                  <span className="font-mono font-bold text-cyan-400">{battery.initial_energy} kWh</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={battery.capacity}
                  step="5"
                  value={battery.initial_energy}
                  onChange={(e) => setBattery({ initial_energy: Number(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400 font-medium">Minimum Energy Reserve</span>
                  <span className="font-mono font-bold text-amber-400">{battery.min_reserve} kWh</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={battery.capacity}
                  step="5"
                  value={battery.min_reserve}
                  onChange={(e) => setBattery({ min_reserve: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Max Charge / Hour</label>
                  <input
                    type="number"
                    min="1"
                    value={battery.max_charge}
                    onChange={(e) => setBattery({ max_charge: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-emerald-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Max Discharge / Hour</label>
                  <input
                    type="number"
                    min="1"
                    value={battery.max_discharge}
                    onChange={(e) => setBattery({ max_discharge: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-indigo-400 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Live Battery Meter Preview */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <BatteryMeter
                capacity={battery.capacity}
                currentEnergy={battery.initial_energy}
                minReserve={battery.min_reserve}
              />
            </div>
          </div>

          {/* Operator Instructions Note Editor */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Operator Instructions (Natural Language)
              </h2>
              <span className="text-[10px] font-mono text-slate-400">LLM Pipeline</span>
            </div>

            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Write instructions in plain English. The backend LLM translates them into optimization constraints.
            </p>

            {/* Example Chips */}
            <div className="mb-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1.5">
                Quick Example Directives:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {exampleChips.map((chip, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAddNote(chip)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all hover:border-emerald-500/40 text-left"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Notes List */}
            <div className="space-y-2 mb-4">
              {operatorNotes.map((note, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                >
                  <span className="font-mono text-slate-400">{idx + 1}.</span>
                  <span className="flex-1 text-slate-200">{note}</span>
                  <button
                    onClick={() => handleRemoveNote(idx)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Note Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newNoteInput}
                onChange={(e) => setNewNoteInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                placeholder="e.g. Do not discharge between 1 PM and 3 PM"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-emerald-500 outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddNote()}
                className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 24-Hour Spreadsheet Table (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                24-Hour Energy Dataset (Spreadsheet)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Directly edit hourly parameters below or import via CSV.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-400">24 Hourly Intervals</span>
          </div>

          {/* Spreadsheet Table with Sticky Header */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 max-h-[580px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 sticky top-0 z-10 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono tracking-wider">
                <tr>
                  <th className="py-3 px-3">Hour</th>
                  <th className="py-3 px-3">Demand (kWh)</th>
                  <th className="py-3 px-3">Solar Gen (kWh)</th>
                  <th className="py-3 px-3">Tariff (BDT/kWh)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {hours.map((h, i) => (
                  <tr key={h.hour} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-1.5 px-3 font-bold text-slate-400">
                      {String(h.hour).padStart(2, '0')}:00
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={h.demand}
                        onChange={(e) => handleCellChange(i, 'demand', e.target.value)}
                        className="w-24 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1 text-emerald-400 font-bold focus:border-emerald-500 outline-none text-right"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={h.solar}
                        onChange={(e) => handleCellChange(i, 'solar', e.target.value)}
                        className="w-24 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1 text-amber-400 font-bold focus:border-amber-500 outline-none text-right"
                      />
                    </td>
                    <td className="py-1.5 px-3">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={h.tariff}
                        onChange={(e) => handleCellChange(i, 'tariff', e.target.value)}
                        className="w-24 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1 text-sky-400 font-bold focus:border-sky-500 outline-none text-right"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Dynamic Totals Footer */}
              <tfoot className="bg-slate-950/90 border-t-2 border-slate-800 font-mono font-bold text-white text-xs sticky bottom-0">
                <tr>
                  <td className="py-3 px-3 uppercase text-slate-400 text-[11px]">Totals / Averages</td>
                  <td className="py-3 px-3 text-emerald-400 text-right">{totalDemand.toFixed(1)} kWh</td>
                  <td className="py-3 px-3 text-amber-400 text-right">{totalSolar.toFixed(1)} kWh</td>
                  <td className="py-3 px-3 text-sky-400 text-right">Avg {avgTariff.toFixed(2)} ৳</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
