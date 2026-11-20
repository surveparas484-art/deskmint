import { getCategory, type ToolDef } from "./registry";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

export function scoreTool(t: ToolDef, query: string): number {
  const q = norm(query);
  if (!q) return 0;
  const name = norm(t.name);
  const kws = t.keywords.map(norm);
  const cat = norm(getCategory(t.category).label);
  let score = 0;
  if (name === q) score += 100;
  else if (name.startsWith(q)) score += 60;
  else if (name.includes(q)) score += 40;
  if (kws.some((k) => k === q)) score += 50;
  else if (kws.some((k) => k.includes(q))) score += 30;
  if (cat.includes(q)) score += 10;
  if (norm(t.description).includes(q)) score += 8;
  // multi-word queries: every token must appear somewhere
  const tokens = q.split(" ");
  if (tokens.length > 1) {
    const hay = `${name} ${kws.join(" ")} ${cat} ${norm(t.description)}`;
    if (tokens.every((tok) => hay.includes(tok))) score += 20;
  }
  return score;
}

export function searchMint(list: ToolDef[], query: string, limit = 50): ToolDef[] {
  if (!norm(query)) return list.slice(0, limit);
  return list
    .map((t) => ({ t, s: scoreTool(t, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.t.name.localeCompare(b.t.name))
    .slice(0, limit)
    .map((x) => x.t);
}
