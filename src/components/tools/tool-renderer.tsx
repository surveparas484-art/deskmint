"use client";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

const Loading = () => (
  <div role="status" aria-label="Loading tool" className="animate-pulse space-y-4 py-2">
    <div className="h-28 rounded-xl bg-surface2" />
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="h-11 rounded-xl bg-surface2" />
      <div className="h-11 rounded-xl bg-surface2" />
    </div>
    <div className="h-10 w-36 rounded-xl bg-surface2" />
  </div>
);

const L = (f: () => Promise<ComponentType>) => dynamic(f, { ssr: false, loading: Loading });

const PdfTarget = (kb: number) => L(() => import("./pdf-convert-tools").then((m) => { const C = m.CompressPdf; return function PdfTargetTool() { return <C defaultTargetKb={kb} />; }; }));
const ImgTarget = (kb: number) => L(() => import("./image-tools").then((m) => { const C = m.ImageCompressor; return function ImgTargetTool() { return <C defaultTargetKb={kb} />; }; }));
const UniCgpa = (preset: string) => L(() => import("./grade-tools").then((m) => { const C = m.CgpaCalculator; return function UniCgpaTool() { return <C defaultPreset={preset} />; }; }));
const LangPair = (src: string, tgt: string) => L(() => import("./translator").then((m) => { const C = m.Translator; return function LangPairTool() { return <C defaultSource={src} defaultTarget={tgt} />; }; }));

// Every id marked "active" in src/lib/registry.ts must appear here.
const map: Record<string, ComponentType> = {
  "age-calculator": L(() => import("./date-tools").then((m) => m.AgeCalculator)),
  "date-difference": L(() => import("./date-tools").then((m) => m.DateDifference)),
  "percentage-calculator": L(() => import("./math-tools").then((m) => m.PercentageCalculator)),
  "discount-calculator": L(() => import("./math-tools").then((m) => m.DiscountCalculator)),
  "unit-converter": L(() => import("./math-tools").then((m) => m.UnitConverter)),
  "attendance-calculator": L(() => import("./math-tools").then((m) => m.AttendanceCalculator)),
  "cgpa-calculator": L(() => import("./grade-tools").then((m) => m.CgpaCalculator)),
  "sgpa-calculator": L(() => import("./grade-tools").then((m) => m.SgpaCalculator)),
  "word-counter": L(() => import("./text-tools").then((m) => m.WordCounter)),
  "merge-pdf": L(() => import("./pdf-tools").then((m) => m.MergePdf)),
  "split-pdf": L(() => import("./pdf-tools").then((m) => m.SplitPdf)),
  "rotate-pdf": L(() => import("./pdf-tools").then((m) => m.RotatePdf)),
  "remove-pdf-pages": L(() => import("./pdf-tools").then((m) => m.RemovePdfPages)),
  "image-compressor": L(() => import("./image-tools").then((m) => m.ImageCompressor)),
  "image-resizer": L(() => import("./image-tools").then((m) => m.ImageResizer)),
  "compress-pdf": L(() => import("./pdf-convert-tools").then((m) => m.CompressPdf)),
  "pdf-to-jpg": L(() => import("./pdf-convert-tools").then((m) => m.PdfToJpg)),
  "images-to-pdf": L(() => import("./pdf-convert-tools").then((m) => m.ImagesToPdf)),
  "extract-pdf-pages": L(() => import("./pdf-edit-tools").then((m) => m.ExtractPdfPages)),
  "rearrange-pdf": L(() => import("./pdf-edit-tools").then((m) => m.OrganizePdf)),
  "add-page-numbers": L(() => import("./pdf-edit-tools").then((m) => m.AddPageNumbers)),
  "add-watermark": L(() => import("./pdf-edit-tools").then((m) => m.AddWatermark)),
  "image-converter": L(() => import("./image-edit-tools").then((m) => m.ImageConverter)),
  "image-cropper": L(() => import("./image-edit-tools").then((m) => m.ImageCropper)),
  "ai-text-summarizer": L(() => import("./ai-tools").then((m) => m.AiSummarizer)),
  "ai-grammar-checker": L(() => import("./ai-tools").then((m) => m.AiGrammar)),
  "ai-text-rewriter": L(() => import("./ai-tools").then((m) => m.AiRewriter)),
  "ai-email-writer": L(() => import("./ai-tools").then((m) => m.AiEmailWriter)),
  "ai-notes-generator": L(() => import("./ai-tools").then((m) => m.AiNotes)),
  "ai-paragraph-expander": L(() => import("./ai-tools").then((m) => m.AiExpander)),
  "ai-language-explainer": L(() => import("./ai-tools").then((m) => m.AiExplainer)),
  "ai-pdf-summarizer": L(() => import("./ai-tools").then((m) => m.AiPdfSummarizer)),
  "translator": L(() => import("./translator").then((m) => m.Translator)),
  "qr-code-generator": L(() => import("./qr-generator").then((m) => m.QrGenerator)),

  // Programmatic SEO High-Intent Landing Pages (Task 10)
  "compress-pdf-to-50kb": PdfTarget(50),
  "compress-pdf-to-100kb": PdfTarget(100),
  "compress-pdf-to-200kb": PdfTarget(200),
  "compress-image-to-20kb": ImgTarget(20),
  "compress-image-to-50kb": ImgTarget(50),
  "sppu-cgpa-to-percentage": UniCgpa("sppu"),
  "mumbai-university-cgpa-to-percentage": UniCgpa("mu"),
  "dbatu-cgpa-to-percentage": UniCgpa("dbatu"),
  "rtmnu-cgpa-to-percentage": UniCgpa("rtmnu"),
  "vtu-cgpa-to-percentage": UniCgpa("vtu"),
  "aktu-cgpa-to-percentage": UniCgpa("aktu"),
  "anna-university-cgpa-to-percentage": UniCgpa("anna"),
  "gtu-cgpa-to-percentage": UniCgpa("gtu"),
  "english-to-marathi-translator": LangPair("en", "mr"),
  "english-to-hindi-translator": LangPair("en", "hi"),
  "hindi-to-english-translator": LangPair("hi", "en"),
};

export function ToolRenderer({ id }: { id: string }) {
  const C = map[id];
  return C ? <C /> : <p role="alert">This tool is not available yet.</p>;
}
