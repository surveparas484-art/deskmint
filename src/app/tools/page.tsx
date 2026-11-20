import type { Metadata } from "next";
import Link from "next/link";
import { Directory } from "@/components/directory";
import { ToolIcon } from "@/components/icons";
import { categories, tools, type CategoryId } from "@/lib/registry";

export const metadata: Metadata = {
  title: "All Mint",
  description: "Browse every PDF tool, image tool, calculator and text utility. Search by name or task and filter by category.",
  alternates: { canonical: "/tools" },
};

export default async function MintPage({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const sp = await searchParams;
  const cat = categories.some((c) => c.id === sp.category) ? (sp.category as CategoryId) : "all";
  const current = categories.find((c) => c.id === cat);
  const avail = (id: CategoryId) => tools.filter((t) => t.category === id && t.status === "active").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/" className="hover:text-fg hover:underline">Home</Link> / {current ? <><Link href="/tools" className="hover:text-fg hover:underline">Mint</Link> / <span className="text-fg" aria-current="page">{current.label}</span></> : <span className="text-fg" aria-current="page">Mint</span>}
      </nav>
      <p className="eyebrow mt-6">{current ? "Category" : "Tool directory"}</p>
      <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{current ? current.label : "All tools"}</h1>
      <p className="mt-2 max-w-2xl text-lg text-muted">
        {current
          ? `${current.blurb} ${avail(current.id)} available now; tools marked coming soon are not usable yet.`
          : "Search every PDF, image, calculator and text tool in one place. Available tools open straight away; tools marked coming soon are not usable yet."}
      </p>
      <div className="mt-8"><Directory key={`${cat}|${sp.q ?? ""}`} initialCategory={cat} initialQuery={sp.q ?? ""} /></div>
      {current && (
        <section className="mt-14" aria-labelledby="other-cats">
          <h2 id="other-cats" className="text-xl font-semibold">Other categories</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.filter((c) => c.id !== current.id).map((c) => (
              <li key={c.id}>
                <Link href={`/tools?category=${c.id}`} className="panel flex items-center gap-3 p-4 transition-colors hover:border-accent/60">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.tone}`}><ToolIcon name={c.icon} className="h-5 w-5" /></span>
                  <span><span className="block font-medium">{c.label}</span><span className="text-xs text-muted">{avail(c.id)} available</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
