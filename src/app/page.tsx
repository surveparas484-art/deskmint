import Link from "next/link";
import { ArrowRight, BookOpen, CheckCheck, Layers, Lock, Smartphone, UserX, Zap } from "lucide-react";
import { siteConfig } from "@/config/site";
import { activeMint, categories, getTool, tools } from "@/lib/registry";
import { ToolSearch } from "@/components/tool-search";
import { ToolCard } from "@/components/tool-card";
import { ToolIcon } from "@/components/icons";

const benefits = [
  { icon: Layers, t: "Easy-to-use tools", d: "One clear screen per task, with instructions and limits written on every tool page." },
  { icon: Lock, t: "Browser-based processing", d: "PDF, image, calculator and text tools run on your device. AI Studio and Translation Studio send text to a server, as the notice on each page says." },
  { icon: UserX, t: "No account needed", d: "Open a tool and use it. There is no registration or login." },
  { icon: Zap, t: "Instant calculators", d: "Calculator and text results update as you type, with the formula shown." },
  { icon: CheckCheck, t: "Honest results", d: "Compression shows measured file sizes and says so plainly when a file did not get smaller." },
  { icon: Smartphone, t: "Accessible and responsive", d: "Keyboard-friendly controls, visible focus, light and dark themes, and layouts built for phones." },
];

// Guides point at the how-to section of real tool pages; no separate guide pages exist yet.
const guides = [
  { title: "How to merge PDF files", slug: "merge-pdf", note: "Combine PDFs in the order you choose." },
  { title: "How to resize an image without distortion", slug: "image-resizer", note: "Keep the aspect ratio locked." },
  { title: "How to make an image file smaller", slug: "image-compressor", note: "Quality, format and width explained." },
  { title: "How to compress a PDF", slug: "compress-pdf", note: "Two methods, with measured results." },
  { title: "How to convert JPG to PDF", slug: "images-to-pdf", note: "Order, page size and margins." },
  { title: "How to calculate age from date of birth", slug: "age-calculator", note: "Years, months and days." },
  { title: "How to calculate percentage from marks", slug: "percentage-calculator", note: "Marks out of total, with the formula." },
  { title: "How to calculate CGPA", slug: "cgpa-calculator", note: "Credit-weighted, with your own conversion rule." },
];

const faqs = [
  { q: "Are the tools free?", a: "Yes. Every tool in this version is free to use." },
  { q: "Do I need an account?", a: "No. None of the tools ask you to register or log in." },
  { q: "How is my data processed?", a: "PDF, image, calculator and text tools run in your browser and do not send your files or text to a server. AI Studio and Translation Studio process your text securely in real time with zero storage." },
  { q: "Are my files stored?", a: "DeskMint does not save your files or text. Browser-based tools keep everything on your device; AI tools pass your text to the AI provider to answer. Your hosting provider may also keep ordinary server logs of page visits." },
  { q: "Which file types and sizes are supported?", a: "PDF tools accept PDF files up to 100 MB each (Merge PDF up to 300 MB in total). Image tools accept JPG, PNG and WebP up to 50 MB each. AI tools accept text up to a per-tool limit shown on the page. Word to PDF and PDF to Word are not available yet. Each tool page lists its own limits." },
  { q: "Does it work on mobile?", a: "Yes. The layout is designed for phones, tablets and desktops, with light and dark themes." },
];

export default function Home() {
  const popular = activeMint.filter((t) => t.quick);
  const shortcuts = popular.slice(0, 4);
  const recent = tools.filter((t) => t.status === "active" && t.added).sort((a, b) => (b.added ?? "").localeCompare(a.added ?? "")).slice(0, 6);
  const comingSoon = tools.length - activeMint.length;

  const site = { "@context": "https://schema.org", "@type": "WebSite", name: siteConfig.name, url: siteConfig.url, description: siteConfig.description, potentialAction: { "@type": "SearchAction", target: `${siteConfig.url}/tools?q={search_term_string}`, "query-input": "required name=search_term_string" } };
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(site) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <section className="relative isolate overflow-hidden border-b border-line">
        <div className="hero-glow pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="grid-bg pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-14 text-center sm:pb-20 sm:pt-20">
          <p className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted">Free online tools · no sign-up</p>
          <h1 className="mt-6 max-w-3xl text-[2.15rem] font-bold leading-[1.1] sm:text-6xl">Every Tool. One Smarter Workspace.</h1>
          <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">Powerful online tools for documents, images, calculations and everyday digital tasks.</p>
          <div className="mt-8 w-full max-w-xl"><ToolSearch /></div>
          <div className="mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-muted">Popular:</span>
            {shortcuts.map((t) => (
              <Link key={t.id} href={`/tools/${t.slug}`} className="chip !min-h-[36px]"><ToolIcon name={t.icon} className="h-3.5 w-3.5" />{t.name}</Link>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/tools" className="btn-primary">Explore All Mint <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link href="/#categories" className="btn-ghost">Browse categories</Link>
          </div>
          <p className="mt-6 text-sm text-muted">{activeMint.length} tools available now · {comingSoon} more coming soon</p>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4" aria-labelledby="popular">
        <div className="flex items-end justify-between gap-3">
          <div><p className="eyebrow">Popular</p><h2 id="popular" className="mt-1 text-2xl font-bold">Popular tools</h2></div>
          <Link href="/tools" className="text-sm font-medium text-accent hover:underline">View all tools</Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{popular.map((t) => <ToolCard key={t.id} tool={t} />)}</div>
      </section>

      <section id="categories" className="mx-auto mt-20 max-w-6xl scroll-mt-24 px-4" aria-labelledby="cats">
        <p className="eyebrow">Explore</p><h2 id="cats" className="mt-1 text-2xl font-bold">Explore categories</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => {
            const list = tools.filter((t) => t.category === c.id);
            const active = list.filter((t) => t.status === "active");
            return (
              <Link key={c.id} href={`/tools?category=${c.id}`} className="panel group flex flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-lg hover:shadow-accent/10 motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset ring-line ${c.tone}`}><ToolIcon name={c.icon} className="h-5 w-5" /></span>
                <h3 className="mt-4 text-lg font-semibold">{c.label}</h3>
                <p className="mt-1 flex-1 text-sm text-muted">{c.blurb}</p>
                <p className="mt-4 text-sm text-muted">{active.length} available{list.length > active.length ? ` · ${list.length - active.length} coming soon` : ""}</p>
              </Link>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-muted">Developer Mint will appear here once they have working tools.</p>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4" aria-labelledby="why">
        <p className="eyebrow">Why us</p><h2 id="why" className="mt-1 text-2xl font-bold">Why {siteConfig.name}?</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map(({ icon: I, t, d }) => (
            <li key={t} className="panel p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-soft text-accent"><I className="h-5 w-5" aria-hidden="true" /></span><h3 className="mt-3 font-semibold">{t}</h3><p className="mt-1 text-sm text-muted">{d}</p></li>
          ))}
        </ul>
      </section>

      {recent.length > 0 && (
        <section className="mx-auto mt-20 max-w-6xl px-4" aria-labelledby="recent">
          <p className="eyebrow">New</p><h2 id="recent" className="mt-1 text-2xl font-bold">Recently added tools</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{recent.map((t) => <ToolCard key={t.id} tool={t} compact />)}</div>
        </section>
      )}

      <section id="guides" className="mx-auto mt-20 max-w-6xl scroll-mt-24 px-4" aria-labelledby="guides-h">
        <p className="eyebrow">Resources</p><h2 id="guides-h" className="mt-1 text-2xl font-bold">Helpful guides</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {guides.filter((g) => getTool(g.slug)?.status === "active").map((g) => (
            <li key={g.slug}>
              <Link href={`/tools/${g.slug}#how-to`} className="panel flex h-full items-start gap-3 p-4 transition-colors hover:border-accent/60">
                <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden="true" />
                <span><span className="block font-medium">{g.title}</span><span className="text-sm text-muted">{g.note}</span></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="privacy" className="mx-auto mt-20 max-w-6xl scroll-mt-24 px-4" aria-labelledby="privacy-h">
        <div className="panel p-6 sm:p-8">
          <p className="eyebrow">Privacy</p><h2 id="privacy-h" className="mt-1 text-2xl font-bold">How your files are handled</h2>
          <ul className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-2">
            <li>PDF, image, calculator and text tools run in your browser. Your files and text are not sent to a server by these tools.</li>
            <li>AI Studio and Translation Studio process your text securely in real time and never store your input (for the AI PDF Summarizer, your PDF file stays in your browser and only extracted text is processed).</li>
            <li>DeskMint stores nothing you enter. Generated files exist in your browser tab until you close it or start over.</li>
            <li>There are no accounts, and no analytics or advertising scripts are loaded unless the site owner switches analytics on and says so in the Privacy Policy.</li>
            <li>Your hosting provider may keep ordinary server logs of page visits. Read the <Link href="/privacy" className="text-accent underline">Privacy Policy</Link> for details.</li>
          </ul>
        </div>
      </section>

      <section id="faq" className="mx-auto mt-20 max-w-3xl scroll-mt-24 px-4" aria-labelledby="faq-h">
        <h2 id="faq-h" className="text-2xl font-bold">Frequently asked questions</h2>
        <div className="mt-5 divide-y divide-line rounded-2xl border border-line bg-surface">
          {faqs.map((f) => (
            <details key={f.q} className="group p-4"><summary className="flex min-h-[32px] cursor-pointer list-none items-center justify-between font-medium">{f.q}<span className="ml-3 text-muted transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary><p className="mt-2 text-sm text-muted">{f.a}</p></details>
          ))}
        </div>
      </section>
    </>
  );
}
