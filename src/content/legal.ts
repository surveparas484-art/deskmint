import { siteConfig } from "@/config/site";

export interface LegalPage { title: string; description: string; paragraphs: string[] }

export const legalPages: Record<string, LegalPage> = {
  about: {
    title: "About", description: `About ${siteConfig.name}.`,
    paragraphs: [
      `${siteConfig.name} is a fast, privacy-first workspace offering everyday PDF tools, image compressors, Indian university CGPA calculators, text utilities, AI writing tools, and a 130+ language translator.`,
      "All PDF, image, calculator, and text tools run locally inside your browser so your files never leave your device.",
      "Our AI Studio and Translation Studio process text securely in real time with zero storage.",
    ],
  },
  contact: {
    title: "Contact", description: `Contact ${siteConfig.name}.`,
    paragraphs: [
      siteConfig.contactEmail
        ? `For support, feedback, or Pro access inquiries, email us at: ${siteConfig.contactEmail}`
        : "Need help or want to unlock DeskMint Pro? Use the Upgrade to Pro form inside any AI tool and our team will reply promptly.",
    ],
  },
  privacy: {
    title: "Privacy Policy", description: `How ${siteConfig.name} protects your privacy.`,
    paragraphs: [
      "PDF, image, calculator, and text tools run 100% locally in your browser. Your files and inputs never leave your device.",
      "AI Studio and Translation Studio process your text securely in real time to generate your requested output. DeskMint does not store, archive, or sell your inputs or outputs. For the AI PDF Summarizer, your PDF file stays in your browser and only extracted text is processed.",
      "There are no mandatory accounts. Your light/dark theme preference and daily free AI counter are stored locally in your browser.",
      ...(siteConfig.gaId ? ["Google Analytics 4 may record aggregate page visits, never the files or text you process."] : []),
      "Standard hosting logs (such as anonymized request metadata) may be maintained by our infrastructure provider to prevent abuse and maintain uptime.",
    ],
  },
  terms: {
    title: "Terms of Use", description: `Terms for using ${siteConfig.name}.`,
    paragraphs: [
      "DeskMint utilities are provided as-is to help you work faster. Please verify critical calculations, translations, and generated documents before official submission.",
      "Automated scraping, abuse of free AI quotas, or attempts to disrupt service availability are prohibited.",
    ],
  },
  disclaimer: {
    title: "Disclaimer", description: `Disclaimer for ${siteConfig.name}.`,
    paragraphs: [
      "Calculator results—including university CGPA/SGPA to percentage conversions—are provided for guidance based on published university circulars. Always verify with your official marksheet or university office.",
      "Nothing on this website constitutes legal, financial, or official academic certification.",
    ],
  },
};
