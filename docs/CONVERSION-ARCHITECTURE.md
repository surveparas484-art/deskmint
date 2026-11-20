# Conversion engines and architecture

## Runs in the browser today (no upload)
| Tool | Engine |
|---|---|
| Merge, Split, Rotate, Remove pages | pdf-lib |
| Page previews, PDF to JPG | pdf.js (pdfjs-dist, legacy build) + Canvas |
| JPG to PDF | Canvas decode (EXIF-aware) + pdf-lib |
| Compress PDF | "Pages as images": pdf.js + Canvas JPEG + pdf-lib. "Optimise structure": pdf-lib |
| Image compress / resize | Canvas |
| ZIP downloads | built-in STORE-method writer (`src/lib/zip.ts`) |

## Not built: Word to PDF and PDF to Word
Both stay "Coming soon" on purpose.
- **Word to PDF** needs a real layout engine (fonts, tables, headers, page breaks). Browser-only options (DOCX to HTML, then print) cannot keep layout faithfully. LibreOffice headless can, but it does not run inside Vercel Functions (size, no system fonts, no process control).
- **PDF to Word** needs layout analysis (paragraph, table and image reconstruction), and scanned PDFs need OCR. A plain text dump into a .docx would not meet "preserve headings, tables and images".

### Recommended design when you are ready
1. A separate conversion service (container on Cloud Run, Fly.io or a VPS) running LibreOffice headless, called from the site. Do not stream large files through Vercel Function bodies; use a short-lived signed upload URL to object storage.
2. Per job: a fresh temp directory and unprivileged user, no network access for the converter, hard timeout (e.g. 60 s), CPU and memory limits, output size cap, deletion of input and output right after download or after a short TTL (e.g. 15 minutes).
3. Validate by magic bytes and size, reject macros and encrypted files, one conversion per process.
4. Rate-limit per IP. Keep any API key on the server only.
5. Update the Privacy Policy and tool pages to say files are uploaded for these two tools, how long they are kept, and that deletion has been verified.
