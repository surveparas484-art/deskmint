export interface YMD { y: number; m: number; d: number }
const DAY = 864e5;
const pad = (n: number) => String(n).padStart(2, "0");

export function parseISO(s: string): YMD | null {
  const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!r) return null;
  const y = Number(r[1]), m = Number(r[2]), d = Number(r[3]);
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
  return { y, m, d };
}
export const utc = (p: YMD) => Date.UTC(p.y, p.m - 1, p.d);
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const fmtDate = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });

const dim = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
function addMonths(p: YMD, n: number): number {
  const t = p.m - 1 + n;
  const y = p.y + Math.floor(t / 12);
  const m0 = ((t % 12) + 12) % 12;
  return Date.UTC(y, m0, Math.min(p.d, dim(y, m0))); // clamps e.g. 31st to month end
}

/** a must be <= b. */
export function diffYMD(a: YMD, b: YMD) {
  let months = (b.y - a.y) * 12 + (b.m - a.m);
  if (addMonths(a, months) > utc(b)) months--;
  const days = Math.round((utc(b) - addMonths(a, months)) / DAY);
  return { years: Math.floor(months / 12), months: months % 12, days, totalMonths: months, totalDays: Math.round((utc(b) - utc(a)) / DAY) };
}

export function nextBirthday(dob: YMD, from: YMD) {
  const at = (y: number) => Date.UTC(y, dob.m - 1, Math.min(dob.d, dim(y, dob.m - 1)));
  let t = at(from.y);
  if (t < utc(from)) t = at(from.y + 1);
  return { ms: t, inDays: Math.round((t - utc(from)) / DAY) };
}
