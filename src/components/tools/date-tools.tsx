"use client";
import { useEffect, useRef, useState } from "react";
import { PartyPopper, RotateCcw, X } from "lucide-react";
import { diffYMD, fmtDate, nextBirthday, parseISO, todayISO, utc } from "@/lib/date";
import { Big, DateInput, ErrorMsg, Formula, Result, ResetButton } from "./ui";

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const mod10 = n % 10;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

function BirthdayConfetti({ runKey }: { runKey: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const colors = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];
    const pieces = Array.from({ length: 90 }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * 180,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 6,
      vx: (Math.random() - 0.5) * 4,
      vy: 2.5 + Math.random() * 4.5,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.2,
      color: colors[Math.floor(Math.random() * colors.length)] as string,
    }));

    let raf = 0;
    const started = performance.now();
    const duration = 4200;

    const tick = (now: number) => {
      const elapsed = now - started;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const alpha = elapsed > duration - 900 ? Math.max(0, (duration - elapsed) / 900) : 1;
      ctx.globalAlpha = alpha;

      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
        p.rot += p.vrot;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (elapsed < duration) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };

    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [runKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}

export function AgeCalculator() {
  const [dob, setDob] = useState("");
  const [asOf, setAsOf] = useState(todayISO());
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [dismissedDob, setDismissedDob] = useState("");

  const a = parseISO(dob), b = parseISO(asOf);
  let error = "";
  if (dob && !a) error = "Enter a valid date of birth.";
  else if (asOf && !b) error = "Enter a valid 'Age on' date.";
  else if (a && a.y < 1900) error = "Dates before 1900 are not supported.";
  else if (a && b && utc(a) > utc(b)) error = "The date of birth must not be after the 'Age on' date.";
  const ok = a && b && !error;
  const r = ok ? diffYMD(a, b) : null;
  const nb = ok ? nextBirthday(a, b) : null;

  const today = parseISO(todayISO());
  const isBirthdayToday = Boolean(ok && a && today && a.m === today.m && a.d === today.d);
  const showCelebration = isBirthdayToday && dismissedDob !== dob;

  useEffect(() => {
    if (isBirthdayToday) {
      setCelebrationKey((k) => k + 1);
    }
  }, [isBirthdayToday, dob]);

  return (
    <div className="space-y-4">
      {showCelebration && celebrationKey > 0 && <BirthdayConfetti runKey={celebrationKey} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <DateInput id="dob" label="Date of birth" value={dob} onChange={(v) => { setDob(v); setDismissedDob(""); }} />
        <DateInput id="asof" label="Age on" value={asOf} onChange={setAsOf} />
      </div>
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {showCelebration && r && (
        <div role="status" className="pop relative overflow-hidden rounded-2xl border border-accent/40 bg-gradient-to-r from-rose-500/15 via-amber-500/15 to-indigo-500/15 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <PartyPopper className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-base font-bold sm:text-lg">
                  Happy {r.years > 0 ? `${ordinal(r.years)} ` : ""}Birthday! 🎂🎈
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  Wishing you a joyful, healthy, and unforgettable year ahead from everyone at DeskMint!
                </p>
                <button
                  type="button"
                  onClick={() => setCelebrationKey((k) => k + 1)}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium hover:border-accent/50"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Replay celebration
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDismissedDob(dob)}
              aria-label="Dismiss birthday message"
              className="rounded-lg p-1 text-muted hover:bg-surface hover:text-fg"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      {r && nb && (
        <Result copyText={`Age: ${plural(r.years, "year")}, ${plural(r.months, "month")}, ${plural(r.days, "day")}`}>
          <Big label="Age" value={`${plural(r.years, "year")}, ${plural(r.months, "month")}, ${plural(r.days, "day")}`} />
          <p className="mt-3 text-sm">Total: {r.totalDays.toLocaleString("en-US")} days ({Math.floor(r.totalDays / 7).toLocaleString("en-US")} weeks).</p>
          <p className="text-sm">Next birthday: {fmtDate(nb.ms)} ({nb.inDays === 0 ? "today! 🎉" : `in ${plural(nb.inDays, "day")}`}).</p>
        </Result>
      )}
      <Formula>whole calendar months since birth, then remaining days. Years = months ÷ 12.</Formula>
      <ResetButton onClick={() => { setDob(""); setAsOf(todayISO()); setDismissedDob(""); }} />
    </div>
  );
}

export function DateDifference() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [incl, setIncl] = useState(false);
  const a = parseISO(from), b = parseISO(to);
  let error = "";
  if ((from && !a) || (to && !b)) error = "Enter valid dates.";
  const r = a && b && !error ? (utc(a) <= utc(b) ? { r: diffYMD(a, b), swapped: false } : { r: diffYMD(b, a), swapped: true }) : null;
  const total = r ? r.r.totalDays + (incl ? 1 : 0) : 0;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <DateInput id="from" label="Start date" value={from} onChange={setFrom} />
        <DateInput id="to" label="End date" value={to} onChange={setTo} />
      </div>
      <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-[rgb(var(--accent))]" checked={incl} onChange={(e) => setIncl(e.target.checked)} />Include the end date in the count</label>
      {error && <ErrorMsg>{error}</ErrorMsg>}
      {r && (
        <Result copyText={`${total.toLocaleString("en-US")} days (${r.r.years} years, ${r.r.months} months, ${r.r.days} days)`}>
          <Big label="Total days" value={total.toLocaleString("en-US")} />
          <p className="mt-3 text-sm">{r.r.years} years, {r.r.months} months, {r.r.days} days ({(total / 7).toLocaleString("en-US", { maximumFractionDigits: 2 })} weeks)</p>
          {r.swapped && <p className="mt-1 text-sm text-muted">The start date was after the end date, so they were swapped.</p>}
        </Result>
      )}
      <Formula>total days = difference between the two calendar dates (+1 if the end date is included).</Formula>
      <ResetButton onClick={() => { setFrom(""); setTo(""); setIncl(false); }} />
    </div>
  );
}
