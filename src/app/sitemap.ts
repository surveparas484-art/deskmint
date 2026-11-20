import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { activeMint, toolUrl } from "@/lib/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url;
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/tools`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    ...activeMint.map((t) => ({
      url: base + toolUrl(t),
      lastModified: t.added ? new Date(t.added) : now,
      changeFrequency: "weekly" as const,
      priority: t.quick ? 0.9 : 0.8,
    })),
    ...["about", "contact", "privacy", "terms", "disclaimer"].map((p) => ({
      url: `${base}/${p}`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
