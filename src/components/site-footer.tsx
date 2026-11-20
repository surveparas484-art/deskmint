import Link from "next/link";
import { Logo } from "./logo";
import { siteConfig } from "@/config/site";

type L = { href: string; label: string; external?: boolean };

const product: L[] = [
  { href: "/", label: "Home" },
  { href: "/tools", label: "All Tools" },
  { href: "/tools?category=pdf", label: "PDF Tools" },
  { href: "/tools?category=image", label: "Image Tools" },
  { href: "/tools?category=calculator", label: "Calculators" },
  { href: "/tools?category=text", label: "Text Tools" },
  { href: "/tools?category=ai", label: "AI Studio" },
  { href: "/tools?category=translate", label: "Translation Studio" },
];

const resources: L[] = [
  { href: "/#guides", label: "Guides" },
  { href: "/#faq", label: "Help & FAQ" },
];

const legal: L[] = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/disclaimer", label: "Disclaimer" },
];

const company: L[] = [
  { href: "/about", label: "About DeskMint" },
  ...(siteConfig.contactEmail ? [{ href: "/contact", label: "Contact" }] : []),
  { href: "https://github.com/surveparas484-art", label: "GitHub", external: true },
  { href: "https://www.linkedin.com/in/paras-surve06", label: "LinkedIn", external: true },
  { href: "mailto:surveparas484@gmail.com", label: "Email" },
];

function Col({ title, links }: { title: string; links: L[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm text-muted">
        {links.map((l) => (
          <li key={l.href}>
            {l.external || l.href.startsWith("mailto:") ? (
              <a
                className="transition-colors hover:text-fg"
                href={l.href}
                target={l.external ? "_blank" : undefined}
                rel={l.external ? "noopener noreferrer" : undefined}
              >
                {l.label}
              </a>
            ) : (
              <Link className="transition-colors hover:text-fg" href={l.href}>
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
        <div className="sm:col-span-2 lg:col-span-1">
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">{siteConfig.tagline}</p>
          <p className="mt-2 max-w-xs text-xs text-muted">
            Free tools, no account needed. Tools marked as local run in your browser.
          </p>
        </div>
        <Col title="Product" links={product} />
        <Col title="Resources" links={resources} />
        <Col title="Legal" links={legal} />
        <Col title="Company" links={company} />
      </div>
      <p className="border-t border-line py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
      </p>
    </footer>
  );
}