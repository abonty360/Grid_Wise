import { useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, X, FileText } from 'lucide-react';

export default function CsvImportModal({ isOpen, onClose, onImportSuccess }) {
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleParseCsv = (text) => {
    setError(null);
    setParsedRows(null);

    const lines = text
      .trim()
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setError('CSV must contain a header row and data rows.');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

    const hourIdx = headers.findIndex((h) => h === 'hour');
    const demandIdx = headers.findIndex((h) => ['demand', 'demand_kwh', 'demand_kw'].includes(h));
    const solarIdx = headers.findIndex((h) => ['solar', 'solar_kwh', 'solar_kw'].includes(h));
    const tariffIdx = headers.findIndex((h) =>
      ['tariff', 'tariff_bdt_per_kwh', 'grid_price_per_kwh', 'price'].includes(h)
    );

    if (hourIdx === -1 || demandIdx === -1 || solarIdx === -1 || tariffIdx === -1) {
      setError(
        'Missing required columns. Required headers: hour, demand_kwh (or demand), solar_kwh (or solar), tariff_bdt_per_kwh (or tariff).'
      );
      return;
    }

    const rows = [];
    const hourSet = new Set();

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length < 4) continue;

      const hour = parseInt(parts[hourIdx], 10);
      const demand = parseFloat(parts[demandIdx]);
      const solar = parseFloat(parts[solarIdx]);
      const tariff = parseFloat(parts[tariffIdx]);

      if (isNaN(hour) || isNaN(demand) || isNaN(solar) || isNaN(tariff)) {
        setError(`Row ${i + 1} contains non-numeric values.`);
        return;
      }

      if (hour < 0 || hour > 23) {
        setError(`Row ${i + 1} has invalid hour ${hour}. Must be between 0 and 23.`);
        return;
      }

      if (hourSet.has(hour)) {
        setError(`Duplicate hour ${hour} found at row ${i + 1}.`);
        return;
      }

      if (demand < 0 || solar < 0 || tariff < 0) {
        setError(`Row ${i + 1} has negative values. All values must be >= 0.`);
        return;
      }

      hourSet.add(hour);
      rows.push({ hour, demand, solar, tariff });
    }

    if (rows.length !== 24) {
      setError(`CSV must contain exactly 24 rows for hours 0 to 23. Found ${rows.length} rows.`);
      return;
    }

    rows.sort((a, b) => a.hour - b.hour);
    setParsedRows(rows);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setCsvText(content);
        handleParseCsv(content);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    if (parsedRows && parsedRows.length === 24) {
      onImportSuccess(parsedRows);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2 text-white font-bold">
            <Upload className="w-5 h-5 text-emerald-400" />
            <h3>Import 24-Hour Energy Data (CSV)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Upload or paste a CSV with 24 hours of data. Supported columns:
          <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400 mx-1">hour</code>,
          <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400 mx-1">demand_kwh</code>,
          <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400 mx-1">solar_kwh</code>,
          <code className="bg-slate-950 px-1.5 py-0.5 rounded text-emerald-400 mx-1">tariff_bdt_per_kwh</code>.
        </p>

        {/* File drop zone */}
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 cursor-pointer bg-slate-950/40 mb-4 transition-all">
          <FileText className="w-8 h-8 text-slate-500 mb-1" />
          <span className="text-xs font-semibold text-slate-300">Click to browse file (.csv)</span>
          <span className="text-[10px] text-slate-500">Must contain exactly 24 hourly rows</span>
          <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
        </label>

        {/* Textarea alternative */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-400 block mb-1">
            Or paste CSV content:
          </label>
          <textarea
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              handleParseCsv(e.target.value);
            }}
            rows={4}
            placeholder={`hour,demand_kwh,solar_kwh,tariff_bdt_per_kwh\n0,45.2,0.0,7.5\n1,42.0,0.0,7.5\n...`}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-xs text-slate-200 focus:border-emerald-500 outline-none"
          />
        </div>

        {/* Error notice */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success preview */}
        {parsedRows && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Valid dataset! 24 hours verified (00:00 to 23:00).</span>
            </div>
            <span className="font-mono font-bold text-white">24 Rows</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
          >
            Cancel
          </button>
          <button
            disabled={!parsedRows}
            onClick={handleConfirm}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-400/20"
          >
            Apply 24-Hour Data
          </button>
        </div>
      </div>
    </div>
  );
}
