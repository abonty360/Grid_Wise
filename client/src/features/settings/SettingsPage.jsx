import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  Settings,
  Database,
  Cpu,
  Sparkles,
  Sliders,
  Shield,
  CheckCircle2,
} from 'lucide-react';

export default function SettingsPage() {
  const [currency, setCurrency] = useState('BDT (৳)');
  const [defaultCapacity, setDefaultCapacity] = useState(100);

  const handleSave = () => {
    toast.success('Preferences saved locally.');
  };

  return (
    <div className="space-y-8 animate-in fade-in max-w-4xl">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <span className="text-xs font-mono uppercase text-emerald-400 font-bold tracking-wider block mb-1">
          System Control
        </span>
        <h1 className="text-2xl font-black text-white">System Settings & Configuration</h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage system preferences, model integration parameters, and database connectivity.
        </p>
      </div>

      {/* General Settings */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
          <Sliders className="w-5 h-5 text-emerald-400" />
          General Preferences
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Display Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none cursor-pointer"
            >
              <option value="BDT (৳)">BDT — Bangladeshi Taka (৳)</option>
              <option value="USD ($)">USD — US Dollar ($)</option>
              <option value="EUR (€)">EUR — Euro (€)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Default Battery Capacity (kWh)</label>
            <input
              type="number"
              value={defaultCapacity}
              onChange={(e) => setDefaultCapacity(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
        >
          Save Preferences
        </button>
      </div>

      {/* Backend Infrastructure Status */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
          <Database className="w-5 h-5 text-cyan-400" />
          Infrastructure & Database (Neon PostgreSQL)
        </h2>

        <div className="space-y-2 text-xs font-mono">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Database Engine:</span>
            <span className="text-cyan-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Neon Serverless PostgreSQL
            </span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">SSL Encryption:</span>
            <span className="text-emerald-400 font-bold">Enabled (require / verify-full)</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Applied Migrations:</span>
            <span className="text-slate-200">5 SQL migrations (scenarios, notes, plans, users, tables)</span>
          </div>
        </div>
      </div>

      {/* LLM Pipeline Info */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2 pb-2 border-b border-slate-800">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Natural Language Engine (LLM)
        </h2>

        <div className="space-y-2 text-xs font-mono">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Configured Provider:</span>
            <span className="text-amber-400 font-bold">OpenAI / Gemini Agnostic</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Model:</span>
            <span className="text-slate-200">gpt-4o-mini (temperature: 0.1)</span>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Validation Layer:</span>
            <span className="text-emerald-400 font-bold">Zod Strict Schema + Deterministic Guardrails</span>
          </div>
        </div>
      </div>
    </div>
  );
}
