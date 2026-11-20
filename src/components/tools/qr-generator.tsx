"use client";
import { useEffect, useState } from "react";
import { ErrorMsg, ResetButton, Select } from "./ui";

type EC = "L" | "M" | "Q" | "H";

export function QrGenerator() {
  const [text, setText] = useState("");
  const [ec, setEc] = useState<EC>("M");
  const [size, setSize] = useState("320");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!text.trim()) { setUrl(""); setError(""); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const mod = await import("qrcode");
        const QR = (mod as unknown as { default?: typeof mod }).default ?? mod;
        const u = await QR.toDataURL(text, { errorCorrectionLevel: ec, width: Number(size), margin: 2 });
        if (!cancelled) { setUrl(u); setError(""); }
      } catch {
        if (!cancelled) { setUrl(""); setError("This text is too long for a QR code at the chosen error-correction level. Shorten it or choose a lower level."); }
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [text, ec, size]);

  return (
    <div className="space-y-4">
      <div><label htmlFor="qrtext" className="label">Text or link</label>
        <textarea id="qrtext" className="input min-h-[96px] py-3" value={text} onChange={(e) => setText(e.target.value)} placeholder="https://example.com" /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select id="qrec" label="Error correction" value={ec} onChange={(v) => setEc(v as EC)} options={[{ value: "L", label: "Low (largest capacity)" }, { value: "M", label: "Medium (default)" }, { value: "Q", label: "Quartile" }, { value: "H", label: "High (most damage-tolerant)" }]} />
        <Select id="qrsize" label="Image size" value={size} onChange={setSize} options={[{ value: "256", label: "256 px" }, { value: "320", label: "320 px" }, { value: "512", label: "512 px" }, { value: "1024", label: "1024 px" }]} />
      </div>
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {url && (
        <div role="status" className="pop flex flex-col items-center gap-4 rounded-xl border border-accent/40 bg-accent/10 p-4">
          <div className="rounded-xl bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Generated QR code for the entered text" width={Number(size)} height={Number(size)} className="h-auto max-w-full" style={{ maxWidth: "min(100%, 320px)" }} />
          </div>
          <a href={url} download="qr-code.png" className="btn-primary">Download PNG</a>
        </div>
      )}
      <ResetButton onClick={() => { setText(""); setEc("M"); setSize("320"); }} />
    </div>
  );
}
