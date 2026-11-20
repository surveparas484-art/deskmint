import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-4xl font-bold">Page not found</h1>
      <p className="mt-3 text-muted">That page does not exist, or the tool is not available yet.</p>
      <div className="mt-6 flex justify-center gap-3"><Link href="/" className="btn-ghost">Home</Link><Link href="/tools" className="btn-primary">Browse tools</Link></div>
    </div>
  );
}
