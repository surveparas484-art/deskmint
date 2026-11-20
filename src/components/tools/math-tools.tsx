"use client";
import { useState } from "react";
import { Big, ErrorMsg, fmt, Formula, NumInput, parseNum, ResetButton, Result, Select } from "./ui";

export function PercentageCalculator() {
  const [mode, setMode] = useState("of");
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const x = parseNum(a), y = parseNum(b);
  const labels: Record<string, [string, string]> = { of: ["Percentage (X)", "Number (Y)"], is: ["Value (X)", "Total (Y)"], change: ["Old value", "New value"] };
  let out = "", formula = "", error = "";
  if (a && b) {
    if (Number.isNaN(x) || Number.isNaN(y)) error = "Enter numbers only.";
    else if (mode === "of") { out = `${fmt(x)}% of ${fmt(y)} = ${fmt((y * x) / 100)}`; formula = "Y × X ÷ 100"; }
    else if (mode === "is") { if (y === 0) error = "The total cannot be zero."; else { out = `${fmt(x)} is ${fmt((x / y) * 100)}% of ${fmt(y)}`; formula = "X ÷ Y × 100"; } }
    else { if (x === 0) error = "Percent change from 0 is undefined."; else { const c = ((y - x) / Math.abs(x)) * 100; out = `${c >= 0 ? "Increase" : "Decrease"} of ${fmt(Math.abs(c))}%`; formula = "(new − old) ÷ |old| × 100"; } }
  }
  return (
    <div className="space-y-4">
      <Select id="pmode" label="What do you want to find?" value={mode} onChange={(v) => { setMode(v); }} options={[{ value: "of", label: "X% of Y" }, { value: "is", label: "X is what % of Y" }, { value: "change", label: "Percent change from old to new" }]} />
      <div className="grid gap-4 sm:grid-cols-2">
        <NumInput id="pa" label={labels[mode]![0]} value={a} onChange={setA} />
        <NumInput id="pb" label={labels[mode]![1]} value={b} onChange={setB} />
      </div>
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {out && !error && <Result copyText={out}><Big label="Result" value={out} /><Formula>{formula} (rounded to at most 4 decimal places)</Formula></Result>}
      <ResetButton onClick={() => { setA(""); setB(""); }} />
    </div>
  );
}

export function DiscountCalculator() {
  const [price, setPrice] = useState("");
  const [pct, setPct] = useState("");
  const p = parseNum(price), d = parseNum(pct);
  let error = "";
  if (price && (Number.isNaN(p) || p < 0)) error = "Enter a price of 0 or more.";
  else if (pct && (Number.isNaN(d) || d < 0 || d > 100)) error = "The discount must be between 0 and 100.";
  const ok = price && pct && !error;
  const save = ok ? (p * d) / 100 : 0;
  const f2 = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumInput id="price" label="Original price" value={price} onChange={setPrice} />
        <NumInput id="disc" label="Discount (%)" value={pct} onChange={setPct} />
      </div>
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {ok && <Result copyText={`Original ${f2(p)}, saving ${f2(save)}, final price ${f2(p - save)}`}><div className="grid gap-4 sm:grid-cols-3"><Big label="Original price" value={f2(p)} /><Big label="You save" value={f2(save)} /><Big label="Final price" value={f2(p - save)} /></div><Formula>saving = price × discount ÷ 100; final = price − saving.</Formula></Result>}
      <ResetButton onClick={() => { setPrice(""); setPct(""); }} />
    </div>
  );
}

type Units = Record<string, number>;
const TABLE: Record<string, { label: string; units: Units }> = {
  length: { label: "Length", units: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344 } },
  mass: { label: "Mass", units: { mg: 1e-6, g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237 } },
  area: { label: "Area", units: { "cm²": 1e-4, "m²": 1, "km²": 1e6, ha: 1e4, "in²": 0.00064516, "ft²": 0.09290304, acre: 4046.8564224, "mi²": 2589988.110336 } },
  volume: { label: "Volume", units: { mL: 0.001, L: 1, "m³": 1000, tsp: 0.00492892159375, tbsp: 0.01478676478125, cup: 0.2365882365, "fl oz": 0.0295735295625, gal: 3.785411784 } },
  temperature: { label: "Temperature", units: { "°C": 1, "°F": 1, K: 1 } },
};
const toK = (v: number, u: string) => (u === "°C" ? v + 273.15 : u === "°F" ? ((v - 32) * 5) / 9 + 273.15 : v);
const fromK = (k: number, u: string) => (u === "°C" ? k - 273.15 : u === "°F" ? ((k - 273.15) * 9) / 5 + 32 : k);

export function UnitConverter() {
  const [cat, setCat] = useState("length");
  const names = Object.keys(TABLE[cat]!.units);
  const [from, setFrom] = useState("km");
  const [to, setTo] = useState("mi");
  const [val, setVal] = useState("");
  const changeCat = (c: string) => { const n = Object.keys(TABLE[c]!.units); setCat(c); setFrom(n[0]!); setTo(n[1] ?? n[0]!); };
  const v = parseNum(val);
  let error = "", out = "";
  if (val) {
    if (Number.isNaN(v)) error = "Enter a number.";
    else if (cat === "temperature") { const k = toK(v, from); if (k < 0) error = "That is below absolute zero."; else out = fromK(k, to).toLocaleString("en-US", { maximumSignificantDigits: 10 }); }
    else if (v < 0) error = "Enter a value of 0 or more.";
    else { const u = TABLE[cat]!.units; out = ((v * u[from]!) / u[to]!).toLocaleString("en-US", { maximumSignificantDigits: 10 }); }
  }
  const opts = names.map((n) => ({ value: n, label: n }));
  return (
    <div className="space-y-4">
      <Select id="ucat" label="Category" value={cat} onChange={changeCat} options={Object.entries(TABLE).map(([k, t]) => ({ value: k, label: t.label }))} />
      <NumInput id="uval" label="Value" value={val} onChange={setVal} />
      <div className="grid gap-4 sm:grid-cols-2"><Select id="ufrom" label="From" value={from} onChange={setFrom} options={opts} /><Select id="uto" label="To" value={to} onChange={setTo} options={opts} /></div>
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {out && !error && <Result copyText={`${val} ${from} = ${out} ${to}`}><Big label={`${val} ${from} equals`} value={`${out} ${to}`} /><Formula>{cat === "temperature" ? "converted through Kelvin." : "value × from-factor ÷ to-factor, via a base unit."} Up to 10 significant digits.</Formula></Result>}
      <ResetButton onClick={() => { setVal(""); changeCat("length"); }} />
    </div>
  );
}

export function AttendanceCalculator() {
  const [att, setAtt] = useState("");
  const [tot, setTot] = useState("");
  const [target, setTarget] = useState("75");
  const A = parseNum(att), T = parseNum(tot), G = parseNum(target);
  let error = "";
  if (att && tot) {
    if ([A, T].some(Number.isNaN) || !Number.isInteger(A) || !Number.isInteger(T)) error = "Enter whole numbers for classes.";
    else if (T <= 0) error = "Total classes must be more than zero.";
    else if (A < 0 || A > T) error = "Attended classes must be between 0 and the total.";
  }
  if (!error && target && (Number.isNaN(G) || G <= 0 || G > 100)) error = "The target must be above 0 and at most 100.";
  const ok = att && tot && target && !error;
  const pct = ok ? (A / T) * 100 : 0;
  const need = ok && pct < G ? (G >= 100 ? Infinity : Math.ceil((G * T - 100 * A) / (100 - G))) : 0;
  const canMiss = ok && pct >= G ? Math.floor((100 * A) / G - T) : 0;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <NumInput id="att" label="Classes attended" value={att} onChange={setAtt} />
        <NumInput id="tot" label="Total classes held" value={tot} onChange={setTot} />
        <NumInput id="tgt" label="Target (%)" value={target} onChange={setTarget} />
      </div>
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {ok && (
        <Result copyText={`Attendance: ${fmt(pct, 2)}%`}>
          <Big label="Attendance" value={`${fmt(pct, 2)}%`} />
          <p className="mt-3 text-sm">
            {pct >= G ? `You are at or above ${fmt(G)}%. You can miss up to ${canMiss} more ${canMiss === 1 ? "class" : "classes"} and stay at or above it, if you attend all the rest.`
              : need === Infinity ? "A 100% target cannot be reached after a missed class." : `Attend the next ${need} ${need === 1 ? "class" : "classes"} in a row to reach ${fmt(G)}%.`}
          </p>
          <Formula>attended ÷ total × 100. Assumes every future class counts equally and you attend each one you plan to.</Formula>
        </Result>
      )}
      <ResetButton onClick={() => { setAtt(""); setTot(""); setTarget("75"); }} />
    </div>
  );
}
