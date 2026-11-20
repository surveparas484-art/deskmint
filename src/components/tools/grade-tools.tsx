"use client";
import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Big, ErrorMsg, fmt, Formula, NumInput, parseNum, ResetButton, Result, Select } from "./ui";

interface Row { id: number; a: string; b: string }
interface Props { rowLabel: string; valueLabel: string; valueMax: number; name: string; conversion?: boolean; defaultPreset?: string }

interface UniPreset { id: string; label: string; mult: string; off: string; note: string }

export const UNI_PRESETS: UniPreset[] = [
  { id: "custom", label: "Custom formula (enter your own)", mult: "", off: "", note: "Enter multiplier and offset from your university circular." },
  { id: "sppu", label: "SPPU (Pune University 2019 / 2024 Pattern) — CGPA × 8.9", mult: "8.9", off: "0", note: "SPPU standard engineering & CBCS conversion: Percentage = CGPA × 8.9 (for CGPA up to 9.5; verify exact slab on your marksheet)." },
  { id: "mu", label: "Mumbai University (MU 10-Point) — 7.1 × CGPA + 11", mult: "7.1", off: "11", note: "Mumbai University 10-point grading circular (for CGPA ≥ 7: 7.4 × CGPA + 12; general 7.1 × CGPA + 11)." },
  { id: "dbatu", label: "DBATU (Lonere, Maharashtra) — (CGPA − 0.5) × 10", mult: "10", off: "-5", note: "DBATU Maharashtra formula: Percentage = (CGPA − 0.5) × 10 = 10 × CGPA − 5." },
  { id: "rtmnu", label: "RTMNU (Nagpur University) — (CGPA − 0.75) × 10", mult: "10", off: "-7.5", note: "RTMNU Nagpur standard conversion: Percentage = (CGPA − 0.75) × 10." },
  { id: "vtu", label: "VTU (Belagavi, Karnataka) — (CGPA − 0.75) × 10", mult: "10", off: "-7.5", note: "VTU CBCS formula: Percentage = (CGPA − 0.75) × 10 (2021+ scheme uses CGPA × 10; adjust if needed)." },
  { id: "aktu", label: "AKTU (UPTU, Uttar Pradesh) — CGPA × 10", mult: "10", off: "0", note: "AKTU standard conversion: Percentage = CGPA × 10." },
  { id: "anna", label: "Anna University (Tamil Nadu) — CGPA × 10", mult: "10", off: "0", note: "Anna University official conversion: Percentage = CGPA × 10." },
  { id: "gtu", label: "GTU (Gujarat Technological Univ.) — (CGPA − 0.5) × 10", mult: "10", off: "-5", note: "GTU official conversion: Percentage = (CGPA − 0.5) × 10." },
  { id: "cbse", label: "Standard CBSE / 10-Point — CGPA × 9.5", mult: "9.5", off: "0", note: "Standard 10-point scale conversion: Percentage = CGPA × 9.5." },
];

function WeightedAverage({ rowLabel, valueLabel, valueMax, name, conversion, defaultPreset = "custom" }: Props) {
  const initial = UNI_PRESETS.find((p) => p.id === defaultPreset) ?? UNI_PRESETS[0]!;
  const nextId = useRef(3);
  const blank = (): Row[] => [{ id: 1, a: "", b: "" }, { id: 2, a: "", b: "" }];
  const [rows, setRows] = useState<Row[]>(blank);
  const [presetId, setPresetId] = useState(initial.id);
  const [mult, setMult] = useState(initial.mult);
  const [off, setOff] = useState(initial.off);
  const [quickCgpa, setQuickCgpa] = useState("");
  const upd = (id: number, k: "a" | "b", v: string) => setRows((r) => r.map((x) => (x.id === id ? { ...x, [k]: v } : x)));

  const onPreset = (id: string) => {
    setPresetId(id);
    const p = UNI_PRESETS.find((x) => x.id === id);
    if (p && p.id !== "custom") { setMult(p.mult); setOff(p.off); }
  };

  const used = rows.filter((r) => r.a || r.b);
  let error = "", sumC = 0, sum = 0;
  for (const r of used) {
    const c = parseNum(r.a), v = parseNum(r.b);
    if (Number.isNaN(c) || Number.isNaN(v)) { error = "Fill in both fields of every row you use, with numbers only."; break; }
    if (c <= 0) { error = "Credits must be more than zero."; break; }
    if (v < 0 || v > valueMax) { error = `${valueLabel} must be between 0 and ${valueMax}.`; break; }
    sumC += c; sum += c * v;
  }
  const m = parseNum(mult), o = off ? parseNum(off) : 0;
  if (!error && conversion && ((mult && Number.isNaN(m)) || Number.isNaN(o))) error = "The conversion values must be numbers.";

  const quickVal = quickCgpa.trim() ? parseNum(quickCgpa) : NaN;
  const quickValid = conversion && !Number.isNaN(quickVal) && quickVal >= 0 && quickVal <= 10 && mult && !Number.isNaN(m);
  const quickPct = quickValid ? Math.max(0, Math.min(100, m * quickVal + o)) : null;

  const avg = used.length && !error ? sum / sumC : null;
  const pct = avg !== null && conversion && mult && !Number.isNaN(m) ? Math.max(0, Math.min(100, m * avg + o)) : null;
  const activePreset = UNI_PRESETS.find((p) => p.id === presetId);

  return (
    <div className="space-y-4">
      {conversion && (
        <fieldset className="space-y-3 rounded-xl border border-line bg-surface2 p-4">
          <legend className="px-1 text-sm font-semibold">University Percentage Conversion</legend>
          <Select id="uni-preset" label="Select University Formula" value={presetId} onChange={onPreset} options={UNI_PRESETS.map((p) => ({ value: p.id, label: p.label }))} />
          {activePreset && <p className="text-xs text-muted">{activePreset.note}</p>}
          <div className="grid gap-3 sm:grid-cols-3">
            <NumInput id="quick-cgpa" label="Quick Convert: Enter CGPA" value={quickCgpa} onChange={setQuickCgpa} placeholder="e.g. 8.45" />
            <NumInput id="mult" label="Multiplier" value={mult} onChange={(v) => { setMult(v); setPresetId("custom"); }} />
            <NumInput id="off" label="Offset (optional)" value={off} onChange={(v) => { setOff(v); setPresetId("custom"); }} />
          </div>
          {quickPct !== null && (
            <Result copyText={`CGPA ${quickVal} = ${fmt(quickPct, 2)}%`}>
              <Big label="Converted Percentage" value={`${fmt(quickPct, 2)}%`} />
              <Formula>{m} × {quickVal} {o >= 0 ? `+ ${o}` : `− ${Math.abs(o)}`} = {fmt(quickPct, 2)}%</Formula>
            </Result>
          )}
        </fieldset>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium">Or calculate {name} from {rowLabel.toLowerCase()}s:</p>
        {rows.map((r, i) => (
          <div key={r.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
            <NumInput id={`${name}-a-${r.id}`} label={`${rowLabel} ${i + 1}: credits`} value={r.a} onChange={(v) => upd(r.id, "a", v)} />
            <NumInput id={`${name}-b-${r.id}`} label={`${rowLabel} ${i + 1}: ${valueLabel}`} value={r.b} onChange={(v) => upd(r.id, "b", v)} />
            <button type="button" className="btn-ghost !px-3" disabled={rows.length === 1} aria-label={`Remove ${rowLabel.toLowerCase()} ${i + 1}`} onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))}><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        ))}
        <button type="button" className="btn-ghost" onClick={() => setRows((x) => [...x, { id: nextId.current++, a: "", b: "" }])}><Plus className="h-4 w-4" aria-hidden="true" />Add {rowLabel.toLowerCase()}</button>
      </div>

      {error && <ErrorMsg>{error}</ErrorMsg>}
      {avg !== null && (
        <Result copyText={`${name}: ${fmt(avg, 4)}${pct !== null ? ` (${fmt(pct, 2)}%)` : ""}`}>
          <Big label={`${name} (${fmt(sumC, 2)} total credits)`} value={fmt(avg, 4)} />
          {pct !== null && <p className="mt-2 text-sm">Converted percentage: <strong>{fmt(pct, 2)}%</strong></p>}
          <Formula>Σ(credits × {valueLabel.toLowerCase()}) ÷ Σ(credits) = {fmt(sum, 4)} ÷ {fmt(sumC, 4)}. Shown to 4 decimal places.</Formula>
        </Result>
      )}
      <ResetButton onClick={() => { setRows(blank()); nextId.current = 3; setQuickCgpa(""); setPresetId(initial.id); setMult(initial.mult); setOff(initial.off); }} />
    </div>
  );
}

export const CgpaCalculator = ({ defaultPreset }: { defaultPreset?: string } = {}) => (
  <WeightedAverage rowLabel="Semester" valueLabel="SGPA" valueMax={10} name="CGPA" conversion defaultPreset={defaultPreset} />
);
export const SgpaCalculator = () => <WeightedAverage rowLabel="Subject" valueLabel="Grade point" valueMax={10} name="SGPA" />;
