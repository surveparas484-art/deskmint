// Single source of truth for brand identity and SEO canonical base URL.
export const siteConfig = {
  name: "DeskMint",
  nameParts: ["Desk", "Mint"] as const,
  tagline: "Every Tool. One Smarter Workspace.",
  promise: "Everything you need. One place. Less time wasted.",
  description:
    "Free online PDF compressor to exact KB, image compressor, Indian university CGPA to percentage calculators (SPPU, Mumbai, DBATU, VTU, AKTU), AI writing studio, and 130+ language translator.",
  // Automatically uses NEXT_PUBLIC_SITE_URL in Vercel/production; switches seamlessly if you upgrade to a custom domain.
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://deskmint.vercel.app").replace(/\/$/, ""),
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  gaId: process.env.NEXT_PUBLIC_GA_ID || "",
  gscVerification: process.env.NEXT_PUBLIC_GSC_VERIFICATION || "",
} as const;
