"use client";
import { useDeferredValue, useMemo, useState } from "react";
import { fmt, ResetButton } from "./ui";

export function WordCounter() {
  const [text, setText] = useState("");
  const d = useDeferredValue(text);
  const s = useMemo(() => {
    const words = d.match(/\S+/g)?.length ?? 0;
    return {
      words,
      chars: Array.from(d).length,
      noSpaces: Array.from(d.replace(/\s/g, "")).length,
      sentences: d.split(/[.!?]+(?:\s+|$)/).filter((x) => x.trim()).length,
      paragraphs: d.split(/\n\s*\n/).filter((p) => p.trim()).length,
      lines: d === "" ? 0 : d.split(/\r?\n/).length,
      minutes: words / 200,
    };
  }, [d]);
  const stats: [string, string][] = [
    ["Words", s.words.toLocaleString("en-US")], ["Characters", s.chars.toLocaleString("en-US")], ["Characters (no spaces)", s.noSpaces.toLocaleString("en-US")],
    ["Sentences (approx.)", s.sentences.toLocaleString("en-US")], ["Paragraphs", s.paragraphs.toLocaleString("en-US")], ["Lines", s.lines.toLocaleString("en-US")],
    ["Reading time", s.words === 0 ? "0 min" : `${fmt(s.minutes, 1)} min`],
  ];
  return (
    <div className="space-y-4">
      <div><label htmlFor="wc" className="label">Your text</label>
        <textarea id="wc" className="input min-h-[200px] py-3" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or paste text here" /></div>
      <dl role="status" aria-live="polite" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([k, v]) => <div key={k} className="rounded-xl border border-line bg-bg p-3"><dt className="text-xs text-muted">{k}</dt><dd className="font-display text-xl font-bold">{v}</dd></div>)}
      </dl>
      <ResetButton onClick={() => setText("")} />
    </div>
  );
}
