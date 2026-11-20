import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { legalPages } from "@/content/legal";

export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(legalPages).map((legal) => ({ legal }));
type Props = { params: Promise<{ legal: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { legal } = await params;
  const p = legalPages[legal];
  return p ? { title: p.title, description: p.description, alternates: { canonical: `/${legal}` } } : {};
}

export default async function LegalPage({ params }: Props) {
  const { legal } = await params;
  const p = legalPages[legal];
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="text-3xl font-bold">{p.title}</h1>
      <div className="mt-6 space-y-4 text-muted">{p.paragraphs.map((t) => <p key={t}>{t}</p>)}</div>
    </div>
  );
}
