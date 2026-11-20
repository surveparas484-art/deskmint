# DeskMint

Next.js (App Router) + React + TypeScript + Tailwind CSS. Built for Vercel.

## Run locally
1. Install Node.js LTS (nodejs.org).
2. In this folder: `npm install`
3. `npm run dev` then open http://localhost:3000

Phase 3 Batch 1 tools (all run in the browser): Merge PDF, Split PDF, Rotate PDF, Remove PDF Pages, Image Compressor, Image Resizer. They use `pdf-lib` and `pdfjs-dist` (added to package.json), so run `npm install` again after replacing an older copy.

Other scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`.

## Phase 4
New tools: Compress PDF, PDF to JPG, JPG to PDF (all in the browser). Word to PDF and PDF to Word are intentionally not built; see `docs/CONVERSION-ARCHITECTURE.md`.

Optional environment variables (see `.env.example`): `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GSC_VERIFICATION`. Nothing is loaded for analytics unless an ID is set.

## Phase 5
New: Target Size compression in Compress PDF; Extract PDF Pages, Organize PDF, Add Page Numbers, Add Watermark; Image Format Converter, Image Cropper; AI Studio (8 tools) and Translation Studio. AI features need an OpenRouter key: see `docs/AI-SETUP.md` and `.env.example`.

## Design
See `DESIGN.md` for the colour tokens, light/dark theme and shared components.

## Where things live
- `src/config/site.ts` brand name, tagline, site URL
- `src/lib/registry.ts` every tool (status `active` or `soon`); homepage, directory, search, sitemap all read from it
- `src/components/tools/` tool interfaces; register new ones in `tool-renderer.tsx`
- `src/app/globals.css` + `tailwind.config.ts` design tokens (light/dark)

## Deploy
Push to GitHub and import in Vercel. Set `NEXT_PUBLIC_SITE_URL` once you have a domain (see `.env.example`).
