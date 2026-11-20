"use client";
import { useState } from "react";
import { Crown, RefreshCw } from "lucide-react";
import { baseName, limitLabel } from "@/lib/files";
import { MAX_CHARS } from "@/lib/ai/limits";
import { MAX_PDF_BYTES } from "@/lib/pdf-ops";
import { AiTextTool, AiUsageBar, CopyButton, PrivacyNote, UpgradeProModal, useAi } from "./ai-shared";
import { Dropzone } from "./file-ui";
import { FileBar, useSinglePdf } from "./pdf-tools";
import { ErrorMsg, Select, Spinner } from "./ui";
import type { AiResult } from "@/lib/ai/client";

const Box = ({ title, text, copy = true }: { title: string; text: string; copy?: boolean }) => (
  <div className="rounded-xl border border-line bg-surface p-4">
    <div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-medium">{title}</p>{copy && <CopyButton text={text} />}</div>
    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed" dir="auto">{text}</div>
  </div>
);

export function AiSummarizer() {
  const [length, setLength] = useState("medium");
  return <AiTextTool task="summarize" label="Text to summarize" placeholder="Paste an article, report or notes here…" button="Summarize" example={"The city council voted on Tuesday to approve a new bus network that will add 12 routes and extend evening service until midnight. Officials said the plan, which costs 18 million dollars over three years, aims to cut average commute times by 15 percent. Critics argued the money should fund road repairs instead, while supporters pointed to rising ridership. The first new routes begin in March."}
    options={<Select id="sum-len" label="Summary length" value={length} onChange={setLength} options={[{ value: "short", label: "Short (2 to 3 sentences)" }, { value: "medium", label: "Medium (one paragraph)" }, { value: "detailed", label: "Detailed (overview, key points, figures)" }]} />}
    buildOptions={() => ({ length })} />;
}

export function AiGrammar() {
  return <AiTextTool task="grammar" label="Text to check" placeholder="Paste text with possible spelling or grammar mistakes…" button="Check and correct" example="Me and my friend goes to the library yesterday, there we seen alot of intresting books about histroy."
    render={(r: AiResult) => { const [fixed, ...rest] = r.text.split(/\n-{3,}\n/); const changes = rest.join("\n---\n").replace(/^\s*Changes:\s*/i, "").trim(); return (
      <div className="space-y-3"><Box title="Corrected text" text={(fixed ?? "").trim()} />{changes && <Box title="What changed" text={changes} copy={false} />}</div>); }} />;
}

export function AiRewriter() {
  const [tone, setTone] = useState("professional");
  return <AiTextTool task="rewrite" label="Text to rewrite" placeholder="Paste the text you want rewritten…" button="Rewrite" example="hey, just checking if u got my message about the meeting. need ur reply asap cuz we gotta book the room"
    options={<Select id="rw-tone" label="Tone" value={tone} onChange={setTone} options={[{ value: "professional", label: "Professional" }, { value: "simple", label: "Simple" }, { value: "formal", label: "Formal" }, { value: "friendly", label: "Friendly" }]} />}
    buildOptions={() => ({ tone })} />;
}

export function AiEmailWriter() {
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("medium");
  const [recipient, setRecipient] = useState("");

  return (
    <AiTextTool
      task="email"
      label="What should the email say?"
      placeholder="List the key points, e.g. who it is for, what you need, any dates or context…"
      button="Write email"
      helper="Bullet points or rough notes work great"
      example={"Need 2 days of leave starting tomorrow due to an urgent family matter. Mention that I have handed over urgent tasks to Rohan and will be reachable on phone if anything critical comes up."}
      options={
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="em-recip" className="label">Recipient (optional)</label>
            <input id="em-recip" className="input" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="e.g. Manager, Professor, Client" />
          </div>
          <Select id="em-tone" label="Tone" value={tone} onChange={setTone} options={[
            { value: "professional", label: "Professional (Natural)" },
            { value: "friendly", label: "Friendly (Warm & Human)" },
            { value: "formal", label: "Formal (Official)" },
            { value: "concise", label: "Concise (Short & Direct)" },
          ]} />
          <Select id="em-len" label="Length" value={length} onChange={setLength} options={[
            { value: "short", label: "Short" },
            { value: "medium", label: "Medium" },
            { value: "detailed", label: "Detailed" },
          ]} />
        </div>
      }
      buildOptions={() => ({ tone, length, recipient })}
      render={(r: AiResult, { rerun, busy }) => {
        const m = /^\s*Subject:\s*(.+?)\s*\n+([\s\S]*)$/i.exec(r.text);
        const subject = m ? (m[1] as string) : "";
        const body = m ? (m[2] as string).trim() : r.text;
        return (
          <div className="space-y-3">
            {subject && <Box title="Subject" text={subject} />}
            <Box title="Email body" text={body} />
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton text={subject ? `Subject: ${subject}\n\n${body}` : body} label="Copy subject and body" />
              <button type="button" disabled={busy} onClick={() => rerun({ tone: "friendly", refine: "Make it warmer and more personal" })} className="btn-ghost !min-h-[36px] !px-3 text-xs">Make it warmer</button>
              <button type="button" disabled={busy} onClick={() => rerun({ length: "short", refine: "Make it tighter and more concise" })} className="btn-ghost !min-h-[36px] !px-3 text-xs">Make it shorter</button>
              <button type="button" disabled={busy} onClick={() => rerun({ tone: "formal", refine: "Make it more polished and formal" })} className="btn-ghost !min-h-[36px] !px-3 text-xs">More formal</button>
              <button type="button" disabled={busy} onClick={() => rerun({ refine: "Write a fresh alternative version with different phrasing" })} className="btn-ghost !min-h-[36px] !px-3 text-xs"><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />Regenerate</button>
            </div>
          </div>
        );
      }}
    />
  );
}

export const AiNotes = () => <AiTextTool task="notes" label="Text to turn into notes" placeholder="Paste a lecture transcript, article or meeting notes…" button="Generate notes" example={"Photosynthesis is the process by which plants make food. It happens in chloroplasts, which contain chlorophyll. Plants take in carbon dioxide through stomata and water through roots. Using light energy, they convert these into glucose and release oxygen. The overall equation is 6CO2 + 6H2O + light gives C6H12O6 + 6O2."} />;
export const AiExpander = () => <AiTextTool task="expand" label="Short text to expand" placeholder="Write a sentence or short paragraph…" button="Expand" helper="Short text works best" example="Regular exercise improves health and mood." />;

export function AiExplainer() {
  const [level, setLevel] = useState("simple");
  return <AiTextTool task="explain" label="Word, sentence or concept to explain" placeholder="e.g. ‘ubiquitous’, ‘opportunity cost’, or a difficult sentence…" button="Explain" example="Opportunity cost"
    options={<Select id="ex-level" label="Explanation level" value={level} onChange={setLevel} options={[{ value: "simple", label: "Very simple" }, { value: "detailed", label: "More detailed" }]} />}
    buildOptions={() => ({ level })} />;
}

export function AiPdfSummarizer() {
  const { src, loading, error: loadErr, pick, clear } = useSinglePdf();
  const [info, setInfo] = useState<{ text: string; pagesRead: number; totalPages: number; truncated: boolean } | null>(null);
  const [extractErr, setExtractErr] = useState("");
  const [extracting, setExtracting] = useState(false);
  const { busy, error, result, remaining, limit, upgradeOpen, setUpgradeOpen, run, reset } = useAi("pdf-summary");

  const onPick = async (files: File[]) => {
    reset(); setInfo(null); setExtractErr("");
    await pick(files);
  };
  const go = async () => {
    if (!src) return; reset(); setExtractErr(""); setExtracting(true);
    try {
      const { extractPdfText } = await import("@/lib/pdf-preview");
      const ex = await extractPdfText(src.bytes, MAX_CHARS["pdf-summary"]);
      if (ex.likelyScanned) { setInfo(null); setExtractErr("This PDF has little or no selectable text. It looks like a scan or an image-only file. DeskMint does not perform OCR, so it cannot be summarized."); return; }
      setInfo(ex);
      await run(ex.text);
    } catch { setExtractErr("The text of this PDF could not be read."); } finally { setExtracting(false); }
  };
  const working = busy || extracting;
  return (
    <div className="space-y-4">
      <AiUsageBar remaining={remaining} limit={limit} onUpgrade={() => setUpgradeOpen(true)} />
      {!src ? <Dropzone id="aipdf-file" label="Choose a PDF or drop it here" hint={`One PDF, up to ${limitLabel(MAX_PDF_BYTES)}. Text-based PDFs only (no OCR).`} accept="application/pdf,.pdf" onFiles={onPick} />
        : <FileBar name={src.file.name} size={src.file.size} pages={src.pageCount} onClear={() => { clear(); reset(); setInfo(null); setExtractErr(""); }} />}
      {loading && <p role="status" className="text-sm text-muted">Reading PDF…</p>}
      {loadErr && <ErrorMsg>{loadErr}</ErrorMsg>}
      {extractErr && <ErrorMsg>{extractErr}</ErrorMsg>}
      {error && (
        <div>
          <ErrorMsg>{error.msg}</ErrorMsg>
          <div className="mt-2 flex flex-wrap gap-2">
            {error.retry && <button type="button" className="btn-ghost" onClick={go} disabled={working}>Try again</button>}
            {error.code === "daily_limit_reached" && (
              <button type="button" className="btn-primary !min-h-[38px] text-sm" onClick={() => setUpgradeOpen(true)}>
                <Crown className="h-4 w-4" aria-hidden="true" />Unlock Unlimited Pro
              </button>
            )}
          </div>
        </div>
      )}
      {src && <div className="flex flex-wrap items-center gap-3"><button type="button" className="btn-primary" disabled={working} onClick={go}>{working ? <><Spinner />{extracting ? "Reading text…" : "Summarizing…"}</> : "Summarize PDF"}</button></div>}
      <p role="status" aria-live="polite" className="sr-only">{working ? "Working" : result ? "Summary ready" : ""}</p>
      {info && result && <p className="text-xs text-muted">Read {info.pagesRead} of {info.totalPages} pages{info.truncated ? `. Only the first ${MAX_CHARS["pdf-summary"].toLocaleString("en-US")} characters were used, so the summary covers the beginning of the document` : ""}{result.chunks && result.chunks > 1 ? `. Long text was summarized in ${result.chunks} parts and combined.` : "."}</p>}
      {result && <Box title={`Summary of ${src ? baseName(src.file.name) : "PDF"}`} text={result.text} />}
      <PrivacyNote />
      <UpgradeProModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} defaultTool="AI PDF Summarizer" />
    </div>
  );
}
