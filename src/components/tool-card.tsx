import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ToolIcon } from "./icons";
import { getCategory, toolUrl, type ToolDef } from "@/lib/registry";

export function ToolCard({ tool, compact = false }: { tool: ToolDef; compact?: boolean; showCategory?: boolean }) {
  const cat = getCategory(tool.category);
  const active = tool.status === "active";
  const body = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className={`flex shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-line ${compact ? "h-10 w-10" : "h-11 w-11"} ${cat.tone}`}><ToolIcon name={tool.icon} className="h-5 w-5" /></span>
        {active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/10 px-2.5 py-0.5 text-xs font-medium text-ok"><span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" />Available</span>
        ) : (
          <span className="inline-flex items-center rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-muted">Coming soon</span>
        )}
      </span>
      <span className="mt-3 block font-display text-base font-semibold">{tool.name}</span>
      <span className="mt-1 block flex-1 text-sm text-muted">{tool.description}</span>
      <span className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs">
        <span className="text-muted">{cat.label}</span>
        {active
          ? <span className="inline-flex items-center gap-1 font-semibold text-accent">Open<ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" /></span>
          : <span className="text-muted">Not available yet</span>}
      </span>
    </>
  );
  const base = `group flex h-full flex-col rounded-2xl border border-line bg-surface ${compact ? "p-4" : "p-5"}`;
  return active ? (
    <Link href={toolUrl(tool)} className={`${base} transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-lg hover:shadow-accent/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0`}>{body}</Link>
  ) : (
    <div className={`${base} border-dashed bg-surface2/60`} aria-label={`${tool.name}, coming soon`}>{body}</div>
  );
}
