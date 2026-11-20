import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Logo() {
  const [a, b] = siteConfig.nameParts;
  return (
    <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold" aria-label={`${siteConfig.name} home`}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <circle cx="13" cy="13" r="10.5" fill="none" stroke="rgb(var(--accent))" strokeWidth="2.2" />
        <circle cx="13" cy="13" r="4" fill="rgb(var(--accent2))" />
        <circle cx="21.5" cy="7" r="2.4" fill="rgb(var(--accent))" />
      </svg>
      <span>{a}<span className="text-accent">{b}</span></span>
    </Link>
  );
}
