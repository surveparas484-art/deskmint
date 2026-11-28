"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { categories } from "@/lib/registry";

interface NavLink { href: string; label: string; cat: string | null; home?: boolean }
const links: NavLink[] = [
  { href: "/", label: "Home", cat: null, home: true },
  { href: "/tools", label: "All Tools", cat: null },
  ...categories.filter((c) => c.id !== "utility").map((c) => ({ href: `/tools?category=${c.id}`, label: c.label, cat: c.id as string })),
];

type ItemsProps = { mobile?: boolean; onNavigate?: () => void };

function Items({ isActive, mobile, onNavigate }: ItemsProps & { isActive: (l: NavLink) => boolean }) {
  return (
    <ul className={mobile ? "grid gap-1" : "flex items-center gap-1"}>
      {links.map((l) => {
        const on = isActive(l);
        return (
          <li key={l.href}>
            <Link href={l.href} onClick={onNavigate} aria-current={on ? "page" : undefined}
              className={`flex items-center rounded-lg px-3 text-sm font-medium transition-colors ${mobile ? "min-h-[44px] text-base" : "min-h-[40px]"} ${on ? "bg-accent/10 text-fg" : "text-muted hover:bg-surface hover:text-fg"}`}>
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ActiveItems(props: ItemsProps) {
  const path = usePathname() ?? "";
  const cat = useSearchParams().get("category");
  const isActive = (l: NavLink) => (l.home ? path === "/" : path.startsWith("/tools") && (l.cat ? cat === l.cat : !cat));
  return <Items {...props} isActive={isActive} />;
}

function NavItems(props: ItemsProps) {
  return (
    <Suspense fallback={<Items {...props} isActive={() => false} />}>
      <ActiveItems {...props} />
    </Suspense>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav aria-label="Main" className="hidden lg:block"><NavItems /></nav>
        <div className="flex items-center gap-2">
          <Link href="/tools#search" className="btn-ghost gap-2 !px-3" aria-label="Search tools">
            <Search className="h-4 w-4" aria-hidden="true" /><span className="hidden text-muted lg:inline">Search tools</span>
          </Link>
          <ThemeToggle />
          <button type="button" className="btn-ghost !px-3 lg:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)}>
            {open ? <X className="h-4 w-4" aria-hidden="true" /> : <Menu className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="pop border-t border-line bg-bg px-4 py-3 lg:hidden">
          <NavItems mobile onNavigate={() => setOpen(false)} />
          <Link href="/tools#search" onClick={() => setOpen(false)} className="btn-ghost mt-3 w-full gap-2"><Search className="h-4 w-4" aria-hidden="true" />Search tools</Link>
        </nav>
      )}
    </header>
  );
}
