import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight, Info, Lock, ShieldCheck } from "lucide-react";
import { activeMint, getCategory, getTool, toolUrl } from "@/lib/registry";
import { siteConfig } from "@/config/site";
import { ToolRenderer } from "@/components/tools/tool-renderer";
import { ToolCard } from "@/components/tool-card";
import { ToolIcon } from "@/components/icons";

export const dynamicParams = false;
export const generateStaticParams = () => activeMint.map((t) => ({ slug: t.slug }));

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = getTool(slug);
  if (!t || t.status !== "active") return {};
  const title = t.seoTitle ?? t.name;
  const desc = t.content?.intro ?? t.description;
  return {
    title,
    description: desc,
    keywords: [t.name, ...t.keywords],
    alternates: { canonical: toolUrl(t) },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description: desc,
      url: toolUrl(t),
      type: "website",
      siteName: siteConfig.name,
    },
    twitter: {
      card: "summary",
      title: `${title} | ${siteConfig.name}`,
      description: desc,
    },
  };
}

export default async function ToolPage({ params }: Props) {
  const { slug } = await params;
  const t = getTool(slug);
  if (!t || t.status !== "active" || !t.content) notFound();
  const c = t.content;
  const cat = getCategory(t.category);
  const related = activeMint.filter((x) => x.category === t.category && x.id !== t.id).slice(0, 6);
  const crumbs = [
    { name: "Home", url: "/" },
    { name: "Mint", url: "/tools" },
    { name: cat.label, url: `/tools?category=${cat.id}` },
    { name: t.name, url: toolUrl(t) },
  ];

  const ldBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((b, i) => ({ "@type": "ListItem", position: i + 1, name: b.name, item: siteConfig.url + b.url })),
  };

  const ldApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: t.name,
    url: siteConfig.url + toolUrl(t),
    description: c.intro,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (Web Browser)",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  const ldHowTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to use ${t.name}`,
    description: c.intro,
    step: c.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
  };

  const ldFaq = c.faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldApp) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldHowTo) }} />
      {ldFaq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldFaq) }} />}

      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
          {crumbs.map((b, i) => (
            <li key={b.url} className="flex items-center gap-1.5">
              {i < crumbs.length - 1 ? <Link href={b.url} className="hover:text-fg hover:underline">{b.name}</Link> : <span aria-current="page" className="text-fg">{b.name}</span>}
              {i < crumbs.length - 1 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </nav>

      <header className="mt-6 flex items-start gap-4">
        <span className={`hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ring-line sm:flex ${cat.tone}`}><ToolIcon name={t.icon} className="h-7 w-7" /></span>
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{t.name}</h1>
          <p className="mt-2 max-w-2xl text-lg text-muted">{c.intro}</p>
          {t.local ? (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-sm">
              <ShieldCheck className="h-4 w-4 text-ok" aria-hidden="true" />
              Runs 100% in your browser. Your files never leave your device.
            </p>
          ) : (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-sm">
              <Lock className="h-4 w-4 text-ok" aria-hidden="true" />
              Privacy-First Processing: Processed securely in real time and never stored by DeskMint.
            </p>
          )}
        </div>
      </header>

      <section className="panel mt-8 overflow-hidden" aria-label={`${t.name} tool`}>
        <div className="flex items-center gap-2 border-b border-line bg-surface2 px-4 py-2.5 text-sm font-medium text-muted sm:px-6"><ToolIcon name={t.icon} className="h-4 w-4" />{t.name}</div>
        <div className="p-4 sm:p-6"><ToolRenderer id={t.id} /></div>
      </section>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <section id="how-to" className="panel scroll-mt-24 p-5"><h2 className="text-lg font-semibold">How to use it</h2>
          <ol className="mt-3 space-y-2.5 text-sm text-muted">{c.steps.map((s, i) => <li key={s} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-fg">{i + 1}</span><span>{s}</span></li>)}</ol></section>
        <section className="panel p-5"><h2 className="text-lg font-semibold">Details &amp; limits</h2>
          <ul className="mt-3 space-y-2.5 text-sm text-muted">{c.limits.map((s) => <li key={s} className="flex gap-3"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{s}</span></li>)}</ul></section>
      </div>

      <section className="panel mt-4 p-5"><h2 className="text-lg font-semibold">How it works</h2><p className="mt-3 text-muted">{c.method}</p>
        {c.example && <p className="mt-3 flex gap-2 rounded-xl border border-line bg-bg p-3 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden="true" /><span><strong>Example:</strong> {c.example}</span></p>}</section>

      <section className="mt-10"><h2 className="text-xl font-semibold">Frequently asked questions</h2>
        <div className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
          {c.faqs.map((f) => <details key={f.q} className="group p-4"><summary className="flex min-h-[32px] cursor-pointer list-none items-center justify-between font-medium">{f.q}<span className="ml-3 text-muted transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary><p className="mt-2 text-sm text-muted">{f.a}</p></details>)}
        </div></section>

      {related.length > 0 && <section className="mt-12"><h2 className="text-xl font-semibold">Related tools</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">{related.map((r) => <ToolCard key={r.id} tool={r} />)}</div></section>}
    </div>
  );
}
