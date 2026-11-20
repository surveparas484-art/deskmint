// Typed tool registry. Directory, search, sitemap, routes and homepage all read from here.
// A tool is "active" ONLY if its UI exists in src/components/tools/tool-renderer.tsx.

export type CategoryId = "pdf" | "image" | "calculator" | "text" | "utility" | "ai" | "translate";

export type IconName =
  | "FileText" | "Files" | "Scissors" | "Trash2" | "RotateCw" | "FileArchive" | "FileOutput" | "ArrowUpDown"
  | "ImageDown" | "Image" | "ImagePlus" | "Maximize2" | "ArrowLeftRight"
  | "Calculator" | "Percent" | "Tag" | "Ruler" | "GraduationCap" | "CalendarClock" | "CalendarRange" | "ClipboardCheck" | "BookOpen"
  | "Sparkles" | "Languages" | "ScrollText" | "SpellCheck" | "PenLine" | "Mail" | "NotebookPen" | "Expand" | "Lightbulb" | "FileSearch" | "Hash" | "Stamp" | "Crop" | "Type" | "CaseSensitive" | "Eraser" | "QrCode" | "ScanLine" | "Timer" | "Hourglass";

export interface FAQ { q: string; a: string }
export interface ToolContent {
  intro: string;
  steps: string[];
  method: string;
  example?: string;
  limits: string[];
  faqs: FAQ[];
}

export interface ToolDef {
  id: string;
  name: string;
  description: string;
  category: CategoryId;
  slug: string;
  keywords: string[];
  icon: IconName;
  status: "active" | "soon";
  requiresFile: boolean;
  local: boolean; // true only if processing really happens in the browser
  quick?: boolean;
  seoTitle?: string; // unique <title> (brand is appended by the layout template)
  added?: string; // ISO date, used for the Recently added list
  content?: ToolContent;
}

export interface CategoryDef {
  id: CategoryId;
  label: string;
  blurb: string;
  icon: IconName;
  tone: string; // full literal Tailwind classes
}

export const categories: CategoryDef[] = [
  { id: "pdf", label: "PDF Mint", blurb: "Merge, split, rotate, compress and build PDFs.", icon: "FileText", tone: "text-rose-600 bg-rose-500/10 dark:text-rose-300" },
  { id: "image", label: "Image Mint", blurb: "Compress, resize and convert images.", icon: "Image", tone: "text-emerald-600 bg-emerald-500/10 dark:text-emerald-300" },
  { id: "calculator", label: "Calculators", blurb: "Age, percentages, grades, units and dates.", icon: "Calculator", tone: "text-blue-600 bg-blue-500/10 dark:text-sky-300" },
  { id: "text", label: "Text Mint", blurb: "Count, clean and transform text.", icon: "Type", tone: "text-violet-600 bg-violet-500/10 dark:text-violet-300" },
  { id: "utility", label: "Everyday Utilities", blurb: "QR codes, timers and small helpers.", icon: "QrCode", tone: "text-amber-600 bg-amber-500/10 dark:text-amber-300" },
  { id: "ai", label: "AI Studio", blurb: "Summarise, proofread, rewrite and explain with AI.", icon: "Sparkles", tone: "text-indigo-600 bg-indigo-500/10 dark:text-indigo-300" },
  { id: "translate", label: "Translation Studio", blurb: "Translate text between Indian and world languages.", icon: "Languages", tone: "text-teal-600 bg-teal-500/10 dark:text-teal-300" },
];

export const getCategory = (id: CategoryId) => categories.find((c) => c.id === id)!;

const soon = (t: Omit<ToolDef, "status" | "content">): ToolDef => ({ ...t, status: "soon" });

export const tools: ToolDef[] = [
  // ---------- PDF (Phase 1, batch 2) ----------
  {
    id: "compress-pdf", name: "Compress PDF", slug: "compress-pdf", category: "pdf", icon: "FileArchive", status: "active", seoTitle: "Compress PDF Online and Reduce File Size", added: "2026-11-01", requiresFile: true, local: true, quick: true,
    description: "Reduce PDF file size and see the measured result.",
    keywords: ["shrink pdf", "reduce pdf size", "pdf smaller", "compress pdf online"],
    content: {
      intro: "Make a PDF smaller and see the real before-and-after size. Choose between compressing pages as images for big savings, or a gentle structure-only optimisation that keeps text.",
      steps: ["Choose a PDF.", "Pick a method and level.", "Press Compress PDF, compare the sizes and download."],
      method: "Compress pages as images: each page is drawn in your browser with pdf.js at 100 to 170 DPI, saved as a JPEG at 60 to 80% quality and assembled into a new PDF with pdf-lib. This can shrink scans and image-heavy files a lot, but text becomes part of the picture, so it is no longer selectable or searchable. Optimise structure: the file is rewritten with object streams and optional metadata removal. Embedded images are not recompressed, so savings are usually small. The tool measures the output and tells you plainly when it is not smaller.",
      example: "Results vary by file. On a synthetic 3-page, photo-heavy test PDF (866 KB), the Strong level gave 340 KB (about 61% smaller) and Balanced gave 560 KB; the Light level came out larger, and the tool reported that.",
      limits: ["Up to 100 MB per file; the image method handles up to 100 pages.", "Image method: text is no longer selectable or searchable, and links and form fields are lost.", "A file that is mostly text may not get smaller, or may get larger. You will be told, and your original is untouched.", "Password-protected PDFs are not supported."],
      faqs: [{ q: "Will my text stay selectable?", a: "With 'Optimise structure' yes; with 'Compress pages as images' no." }, { q: "Why is the result sometimes larger?", a: "Turning text pages into images can produce a bigger file than the original vector text. The tool reports this instead of calling it compression." }],
    },
  },
  {
    id: "pdf-to-jpg", name: "PDF to JPG", slug: "pdf-to-jpg", category: "pdf", icon: "FileOutput", status: "active", seoTitle: "PDF to JPG Converter Online Free", added: "2026-11-01", requiresFile: true, local: true,
    description: "Convert PDF pages to JPG images, with ZIP download.",
    keywords: ["pdf to image", "pdf to jpeg", "convert pdf to jpg", "pdf pages to images"],
    content: {
      intro: "Turn the pages of a PDF into JPG images. Pick all pages or a range, choose resolution and quality, preview the results and download them one by one or as a ZIP.",
      steps: ["Choose a PDF.", "Select pages, resolution and JPG quality.", "Press Convert to JPG, then download single images or the ZIP."],
      method: "Each page is drawn on a canvas in your browser with pdf.js at the DPI you choose (PDF points are 1/72 inch, so 150 DPI is a scale of about 2.08) on a white background and saved as a JPEG. The ZIP is created in the browser without compression because JPEG data is already compressed.",
      example: "An A4 page (595×842 pt) at 150 DPI becomes a 1240×1754 pixel image.",
      limits: ["Up to 100 MB per PDF and 100 pages per run.", "Very large pages at high DPI are refused with a message instead of crashing the tab (limit 40 million pixels per page).", "Password-protected PDFs are not supported."],
      faqs: [{ q: "Which resolution should I choose?", a: "72 to 100 DPI for screens, 150 as a good default, 200 to 300 for printing." }, { q: "Is anything uploaded?", a: "No. Rendering and ZIP creation happen in your browser." }],
    },
  },
  soon({ id: "word-to-pdf", name: "Word to PDF", description: "Needs a server-side conversion engine to keep layout accurate. Planned, not available yet.", category: "pdf", slug: "word-to-pdf", keywords: ["docx to pdf", "convert word to pdf", "doc to pdf"], icon: "FileText", requiresFile: true, local: false }),
  soon({ id: "pdf-to-word", name: "PDF to Word", description: "Needs a server-side conversion engine for usable layout and tables. Planned, not available yet.", category: "pdf", slug: "pdf-to-word", keywords: ["pdf to docx", "convert pdf to word", "pdf to doc"], icon: "FileText", requiresFile: true, local: false }),
  {
    id: "merge-pdf", name: "Merge PDF", slug: "merge-pdf", category: "pdf", icon: "Files", status: "active", seoTitle: "Merge PDF Files Online Free", added: "2026-10-31", requiresFile: true, local: true, quick: true,
    description: "Combine several PDFs into one, in the order you choose.",
    keywords: ["combine pdf", "join pdf", "merge pdf files"],
    content: {
      intro: "Join two or more PDF files into a single document. You decide the order, and the pages are copied across unchanged.",
      steps: ["Add two or more PDF files.", "Use the arrow buttons to put them in the order you want.", "Press Merge PDFs, then download merged.pdf."],
      method: "Each file is opened with the pdf-lib library in your browser and its pages are copied, in order, into a new PDF. Pages keep their original size and content. Nothing is uploaded.",
      limits: ["Up to 100 MB per file and 300 MB in total.", "Password-protected PDFs are rejected with a message. Remove the password first.", "Bookmarks and form fields from the source files may not carry over."],
      faqs: [{ q: "Can I change the order after adding files?", a: "Yes. Use the up and down buttons next to each file before merging." }, { q: "Does merging reduce quality?", a: "No. Pages are copied as they are, not re-rendered." }],
    },
  },
  {
    id: "split-pdf", name: "Split PDF", slug: "split-pdf", category: "pdf", icon: "Scissors", status: "active", seoTitle: "Split PDF by Page Range Online Free", added: "2026-10-31", requiresFile: true, local: true,
    description: "Split a PDF by page ranges into separate files.",
    keywords: ["separate pdf", "divide pdf", "extract pdf pages", "pdf page range"],
    content: {
      intro: "Pull the pages you need out of a PDF, either as one new file or as a separate file for each range.",
      steps: ["Choose a PDF.", "Type the pages you want, for example 1-3, 5, 8-10.", "Pick one combined file or one file per range, then press Extract pages."],
      method: "The selected pages are copied from your PDF into new PDF files using pdf-lib, entirely in your browser. In single-file mode pages appear in the order you typed them; repeated pages are included once.",
      example: "With a 12-page PDF, '2-4, 9' in single-file mode gives a 4-page PDF (pages 2, 3, 4 and 9).",
      limits: ["Up to 100 MB per file.", "Separate-file mode allows up to 50 ranges and gives you one download button per file.", "Password-protected PDFs are not supported."],
      faqs: [{ q: "Which page numbers does it use?", a: "The position of the page in the file, starting from 1, not any printed page number." }],
    },
  },
  {
    id: "remove-pdf-pages", name: "Remove PDF Pages", slug: "remove-pdf-pages", category: "pdf", icon: "Trash2", status: "active", seoTitle: "Remove Pages from PDF Online Free", added: "2026-10-31", requiresFile: true, local: true,
    description: "Preview pages and delete the ones you do not need.",
    keywords: ["delete pdf pages", "remove pages from pdf", "pdf page remover"],
    content: {
      intro: "See every page as a thumbnail, tap the ones you want gone and download the PDF without them.",
      steps: ["Choose a PDF and wait for the previews.", "Tap pages to mark them, or type page numbers.", "Press Remove, then download the edited PDF."],
      method: "Previews are drawn in your browser with pdf.js. The pages you marked are then deleted from a copy of the document with pdf-lib and the result is saved as a new PDF. Your original file is not changed.",
      limits: ["Previews are generated for the first 120 pages; for longer files type the page numbers.", "At least one page must remain.", "Password-protected PDFs are not supported."],
      faqs: [{ q: "What if previews do not load?", a: "Page selection still works by number. Previews depend on your browser supporting the PDF viewer library." }],
    },
  },
  {
    id: "rotate-pdf", name: "Rotate PDF", slug: "rotate-pdf", category: "pdf", icon: "RotateCw", status: "active", seoTitle: "Rotate PDF Pages Online Free", added: "2026-10-31", requiresFile: true, local: true,
    description: "Rotate all or selected pages of a PDF.",
    keywords: ["turn pdf", "flip pdf", "rotate pdf pages", "fix sideways pdf"],
    content: {
      intro: "Turn every page, or only the pages you choose, by 90°, 180° or 270° clockwise.",
      steps: ["Choose a PDF.", "Pick all pages or selected pages, and the angle.", "Press Rotate PDF and download the result."],
      method: "Each chosen page gets a new rotation value equal to its current rotation plus the angle you picked (modulo 360°), set with pdf-lib. Page content is not re-drawn, so quality is unchanged.",
      example: "A page already rotated 90° and turned by 270° ends up at 0°.",
      limits: ["Rotation is added to any rotation the page already has.", "Up to 100 MB per file; password-protected PDFs are not supported."],
      faqs: [{ q: "How do I rotate anticlockwise?", a: "Rotating 270° clockwise is the same as 90° anticlockwise." }],
    },
  },
  {
    id: "extract-pdf-pages", name: "Extract PDF Pages", slug: "extract-pdf-pages", category: "pdf", icon: "FileOutput", status: "active", seoTitle: "Extract Pages from PDF Online Free", added: "2026-11-02", requiresFile: true, local: true,
    description: "Pick pages from thumbnails or ranges and save them as a new PDF.",
    keywords: ["pdf pages to new pdf", "extract pages from pdf", "select pdf pages", "save pdf pages"],
    content: {
      intro: "See every page as a thumbnail, tap the ones you need or type ranges like 1-3, 7, and download them as a new PDF. Your original file is never changed.",
      steps: ["Choose a PDF and wait for the thumbnails.", "Tap pages or type page numbers and ranges.", "Press Extract and download the new PDF."],
      method: "Selected pages are copied from your PDF into a new document with pdf-lib in your browser, in the order you list them. Thumbnails are drawn with pdf.js. Nothing is uploaded.",
      example: "'2-4, 9' on a 12-page PDF gives a 4-page PDF containing pages 2, 3, 4 and 9.",
      limits: ["Up to 100 MB per file.", "Thumbnails are shown for the first 120 pages; type numbers for later pages.", "Password-protected PDFs are not supported."],
      faqs: [{ q: "How is this different from Split PDF?", a: "Split PDF can also create one file per range. Extract PDF Pages focuses on picking pages visually." }],
    },
  },
  {
    id: "rearrange-pdf", name: "Organize PDF", slug: "rearrange-pdf", category: "pdf", icon: "ArrowUpDown", status: "active", seoTitle: "Organize PDF: Reorder, Rotate and Delete Pages", added: "2026-11-02", requiresFile: true, local: true,
    description: "Reorder, rotate and delete PDF pages with thumbnails.",
    keywords: ["rearrange pdf", "reorder pdf pages", "organize pdf pages", "sort pdf pages", "rearrange pdf pages"],
    content: {
      intro: "Rearrange the pages of a PDF by dragging thumbnails, rotate single pages, delete the ones you do not want and export the result.",
      steps: ["Choose a PDF and wait for the thumbnails.", "Drag pages (or use the arrow buttons), rotate with the rotate button and mark pages for deletion.", "Press Export PDF and download the result."],
      method: "Your plan (new order, extra rotation, deleted pages) is applied with pdf-lib: kept pages are copied into a new document in the new order, and each page's rotation is increased by the amount you chose. Thumbnails come from pdf.js. Your original file is not modified.",
      limits: ["PDFs of up to 120 pages; use Split PDF or Extract PDF Pages first for longer files.", "Drag and drop works with a mouse; on touch screens use the arrow buttons.", "Password-protected PDFs are not supported."],
      faqs: [{ q: "Can I undo a deletion?", a: "Yes. A deleted page stays visible, dimmed, until you export. Use the restore button to bring it back." }],
    },
  },
  {
    id: "add-page-numbers", name: "Add Page Numbers", slug: "add-page-numbers", category: "pdf", icon: "Hash", status: "active", seoTitle: "Add Page Numbers to PDF Online Free", added: "2026-11-02", requiresFile: true, local: true,
    description: "Add page numbers to a PDF with position, size, colour and format.",
    keywords: ["number pdf pages", "page numbers pdf", "add page numbers to pdf", "pdf pagination"],
    content: {
      intro: "Stamp page numbers onto every page of a PDF. Choose top or bottom, left, centre or right, the font size and colour, the starting number and a format such as 'Page 1 of 10'.",
      steps: ["Choose a PDF.", "Set position, alignment, size, colour, starting number and format.", "Press Add numbers and preview, check the preview and download."],
      method: "Each page gets a line of text drawn with pdf-lib in Helvetica, placed 36 pt from the edge. On pages with a built-in rotation, the position is calculated for the page as it is displayed, so numbers stay upright and in the right corner. {n} is the page number and {total} is the last number shown.",
      example: "Format 'Page {n} of {total}', start 1, on a 10-page PDF gives 'Page 1 of 10' to 'Page 10 of 10'. To skip a cover page set 'First page to number' to 2.",
      limits: ["Latin letters, digits and common punctuation only (standard PDF font).", "Numbers are drawn on top of the page content, so they can overlap text near the edge.", "Password-protected PDFs are not supported."],
      faqs: [{ q: "Can I start numbering at a different page?", a: "Yes. Set 'First page to number' and 'Starting number'." }],
    },
  },
  {
    id: "add-watermark", name: "Add Watermark", slug: "add-watermark", category: "pdf", icon: "Stamp", status: "active", seoTitle: "Add Watermark to PDF Online Free", added: "2026-11-02", requiresFile: true, local: true,
    description: "Add a text or image watermark to PDF pages, with opacity and rotation.",
    keywords: ["watermark pdf", "pdf watermark", "stamp pdf", "add logo to pdf", "confidential watermark"],
    content: {
      intro: "Place a text or image watermark on all pages or selected pages of a PDF. Choose position, size, opacity and rotation, then check a preview before downloading.",
      steps: ["Choose a PDF.", "Pick a text or image watermark and set size, colour, opacity, rotation and position.", "Choose which pages, press Apply and preview, then download."],
      method: "The watermark is drawn onto each chosen page with pdf-lib with the opacity and rotation you set. Position is calculated for the page as displayed, including pages with a built-in rotation. Text uses Helvetica Bold; image watermarks can be PNG (with transparency), JPG or WebP.",
      limits: ["Text watermarks support Latin letters, digits and punctuation; use an image for other scripts.", "A watermark is drawn on the page and is not a security feature. It can be removed by someone who edits the PDF.", "Password-protected PDFs are not supported."],
      faqs: [{ q: "Does the watermark go behind or in front of the content?", a: "In front, with the opacity you choose." }],
    },
  },
  {
    id: "images-to-pdf", name: "JPG to PDF", slug: "images-to-pdf", category: "pdf", icon: "ImagePlus", status: "active", seoTitle: "JPG to PDF Converter Online Free", added: "2026-11-01", requiresFile: true, local: true, quick: true,
    description: "Turn JPG, PNG and WebP images into one PDF.",
    keywords: ["jpg to pdf", "png to pdf", "photo to pdf", "images to pdf", "convert jpg to pdf"],
    content: {
      intro: "Combine one or more images into a single PDF. Reorder the pages, choose A4, US Letter or fit-to-image pages, and set the orientation and margins.",
      steps: ["Add your images (JPG, PNG or WebP).", "Reorder them and choose page size, orientation and margin.", "Press Create PDF and download images.pdf."],
      method: "Each image is decoded in your browser, so phone-photo rotation is applied correctly, then placed on its own PDF page with pdf-lib. Images are scaled to fit inside the margins and centred. JPG and WebP are re-encoded at 92% quality; PNG is kept lossless.",
      example: "A 4000×3000 photo on an A4 page with automatic orientation becomes a landscape A4 page with the photo scaled to fill the width.",
      limits: ["Up to 50 images per PDF, 50 MB each and 300 MB in total.", "Animated images use their first frame.", "Output quality is not adjustable; JPG and WebP use 92%."],
      faqs: [{ q: "Can I put several images on one page?", a: "Not yet. Each image gets its own page." }, { q: "Does it keep PNG transparency?", a: "Yes, on the page background, which is white." }],
    },
  },
  // ---------- Image (batch 3) ----------
  {
    id: "image-compressor", name: "Image Compressor", slug: "image-compressor", category: "image", icon: "ImageDown", status: "active", seoTitle: "Image Compressor: Reduce JPG, PNG and WebP Size", added: "2026-10-31", requiresFile: true, local: true, quick: true,
    description: "Shrink JPG, PNG and WebP images with a quality control.",
    keywords: ["compress image", "reduce photo size", "compress jpg", "make image smaller"],
    content: {
      intro: "Re-encode a JPG, PNG or WebP image at a quality you choose and compare the real file sizes before downloading.",
      steps: ["Choose an image.", "Pick an output format and quality, and optionally a maximum width.", "Compare the sizes and download."],
      method: "The image is drawn onto a canvas in your browser and encoded again with the format and quality you chose. JPG and WebP are lossy: lower quality means smaller files but less detail. PNG is lossless and ignores the quality setting. The tool shows the measured original and output sizes and tells you plainly if the result is not smaller.",
      limits: ["Not every image gets smaller; already-optimised files can grow, and you will be told.", "JPG output has no transparency, so transparent areas become white.", "WebP output needs browser support; you will see a message if it is missing.", "One image at a time, up to 50 MB."],
      faqs: [{ q: "Why did my PNG get bigger?", a: "Re-saving a PNG without changing it rarely shrinks it. Try JPG or WebP, or reduce the maximum width." }],
    },
  },
  {
    id: "image-resizer", name: "Image Resizer", slug: "image-resizer", category: "image", icon: "Maximize2", status: "active", seoTitle: "Resize Image Online Without Losing Proportions", added: "2026-10-31", requiresFile: true, local: true,
    description: "Resize images by pixels or percentage, keeping proportions.",
    keywords: ["resize photo", "change image size", "image dimensions", "scale image"],
    content: {
      intro: "Set an exact width and height in pixels, with the aspect ratio locked by default, and download the resized image.",
      steps: ["Choose an image.", "Enter a width or height, or use a quick percentage.", "Press Resize image, compare and download."],
      method: "The image is drawn at the new size on a canvas in your browser using high-quality smoothing, then saved in the original format (JPG and WebP at 92% quality). With the aspect ratio locked, changing one side recalculates the other from the original proportions.",
      example: "A 4000×3000 image set to 1000 px wide becomes 1000×750.",
      limits: ["Maximum 10,000 px per side and 40 million pixels in total.", "Enlarging cannot add detail.", "One image at a time, up to 50 MB."],
      faqs: [{ q: "Does it keep the file format?", a: "Yes. A JPG stays a JPG, a PNG stays a PNG and a WebP stays a WebP." }],
    },
  },

  {
    id: "image-converter", name: "Image Format Converter", slug: "image-converter", category: "image", icon: "ArrowLeftRight", status: "active", seoTitle: "Image Converter: JPG, PNG and WebP Online Free", added: "2026-11-02", requiresFile: true, local: true,
    description: "Convert JPG, PNG and WebP images to JPG, PNG or WebP, with ZIP download.",
    keywords: ["jpg to png", "png to jpg", "jpg to webp", "png to webp", "webp to jpg", "webp to png", "convert image format"],
    content: {
      intro: "Convert several images at once between JPG, PNG and WebP. Choose the output format and quality, check the before-and-after sizes and download images individually or as a ZIP.",
      steps: ["Add one or more JPG, PNG or WebP images.", "Choose the output format and, for JPG and WebP, the quality.", "Press Convert and download the results."],
      method: "Each image is decoded in your browser and drawn on a canvas, then encoded in the format you chose. JPG and WebP are lossy and use your quality setting; PNG is lossless. Images already in the target format are skipped. The ZIP is created in your browser.",
      example: "A 1.2 MB PNG photo converted to JPG at 90% quality is typically far smaller, but some detail is lost and transparency becomes white.",
      limits: ["Up to 30 images, 50 MB each and 300 MB in total.", "Converting to a lossy format loses some detail and cannot be reversed; converting a JPG to PNG does not restore quality.", "WebP output needs browser support; you will see a message if it is missing.", "Animated images use their first frame."],
      faqs: [{ q: "Which conversions are supported?", a: "JPG to PNG, JPG to WebP, PNG to JPG, PNG to WebP, WebP to JPG and WebP to PNG." }, { q: "Is it lossless?", a: "Only when the output is PNG, and even then the result keeps any quality already lost in the source." }],
    },
  },
  {
    id: "image-cropper", name: "Image Cropper", slug: "image-cropper", category: "image", icon: "Crop", status: "active", seoTitle: "Crop Image Online: Free, 1:1, 4:5, 16:9", added: "2026-11-02", requiresFile: true, local: true,
    description: "Crop images freely or to 1:1, 4:5 and 16:9, then download as JPG, PNG or WebP.",
    keywords: ["crop image", "crop photo", "square crop", "crop to 16:9", "image crop online"],
    content: {
      intro: "Drag a crop box over your image, lock it to a square, portrait 4:5 or landscape 16:9 ratio or leave it free, fine-tune it with exact pixel values and download the result.",
      steps: ["Choose an image.", "Drag the box and its corners, pick a ratio or type X, Y, width and height.", "Choose the format and press Crop image to download."],
      method: "The selected rectangle (in the image's real pixels) is copied from the full-resolution image to a canvas and saved in the format you choose. Working in real pixels means the crop is exact, whatever the size of the preview on your screen.",
      limits: ["Up to 50 MB per image.", "JPG output has no transparency; transparent areas become white.", "One image at a time."],
      faqs: [{ q: "Does cropping reduce quality?", a: "Not by itself. PNG output is lossless; JPG and WebP are re-compressed at the quality you choose." }],
    },
  },

  {
    id: "ai-text-summarizer", name: "AI Text Summarizer", slug: "ai-text-summarizer", category: "ai", icon: "ScrollText", status: "active", seoTitle: "AI Text Summarizer: Summarize Text Online Free", added: "2026-11-02", requiresFile: false, local: false,
    description: "Shorten long text into a short, medium or detailed summary.",
    keywords: ["summarize text", "text summary", "tldr", "article summarizer"],
    content: {
      intro: "Paste an article, report or notes and get a short, medium or detailed summary that keeps the important facts, names and numbers.",
      steps: ["Paste your text (up to 20,000 characters).", "Choose a summary length.", "Press Summarize and copy the result."],
      method: "Your text is wrapped in delimiters and sent with instructions to summarise accurately and add nothing that is not in the text. The text is sent to this site's server, which forwards it to an AI model through DeskMint AI. The model is chosen by the site owner and is a free model by default, so it can be slow, busy or temporarily unavailable. Your input is not stored by DeskMint.",
      limits: ["Up to 20,000 characters per request.", "AI output can be wrong or incomplete; check anything important.", "Free AI models have usage limits, so you may sometimes be asked to wait and try again.", "Do not enter passwords, financial details or other sensitive information."],
      faqs: [{ q: "Does it keep the original language?", a: "Yes, the summary is written in the language of your text." }],
    },
  },
  {
    id: "ai-grammar-checker", name: "AI Grammar Checker", slug: "ai-grammar-checker", category: "ai", icon: "SpellCheck", status: "active", seoTitle: "AI Grammar Checker: Fix Grammar and Spelling Online", added: "2026-11-02", requiresFile: false, local: false,
    description: "Correct grammar, spelling and sentence structure and see what changed.",
    keywords: ["grammar check", "spell check", "proofread text", "fix grammar"],
    content: {
      intro: "Paste your writing and get a corrected version, with a short list of the main changes made.",
      steps: ["Paste your text (up to 8,000 characters).", "Press Check and correct.", "Copy the corrected text."],
      method: "The AI proofreads your text, corrects grammar, spelling and punctuation, and keeps your meaning, tone and language. The text is sent to this site's server, which forwards it to an AI model through DeskMint AI. The model is chosen by the site owner and is a free model by default, so it can be slow, busy or temporarily unavailable. Your input is not stored by DeskMint.",
      limits: ["Up to 8,000 characters per request.", "It may miss subtle errors or change style slightly; review the corrected text.", "AI output can be wrong or incomplete; check anything important.", "Free AI models have usage limits, so you may sometimes be asked to wait and try again.", "Do not enter passwords, financial details or other sensitive information."],
      faqs: [{ q: "Will it change my meaning?", a: "It is instructed not to, but always read the result before using it." }],
    },
  },
  {
    id: "ai-text-rewriter", name: "AI Text Rewriter", slug: "ai-text-rewriter", category: "ai", icon: "PenLine", status: "active", seoTitle: "AI Text Rewriter: Change Tone Online Free", added: "2026-11-02", requiresFile: false, local: false,
    description: "Rewrite text in a professional, simple, formal or friendly tone.",
    keywords: ["rewrite text", "paraphrase", "change tone", "rephrase"],
    content: {
      intro: "Rewrite any text in a professional, simple, formal or friendly tone while keeping its meaning.",
      steps: ["Paste your text (up to 8,000 characters).", "Choose a tone.", "Press Rewrite and copy the result."],
      method: "The AI rewrites the text in the chosen tone and is instructed to preserve all facts and the original meaning. The text is sent to this site's server, which forwards it to an AI model through DeskMint AI. The model is chosen by the site owner and is a free model by default, so it can be slow, busy or temporarily unavailable. Your input is not stored by DeskMint.",
      limits: ["Up to 8,000 characters per request.", "AI output can be wrong or incomplete; check anything important.", "Free AI models have usage limits, so you may sometimes be asked to wait and try again.", "Do not enter passwords, financial details or other sensitive information."],
      faqs: [{ q: "Can I rewrite in another language?", a: "The output uses the language of your input." }],
    },
  },
  {
    id: "ai-email-writer", name: "AI Email Writer", slug: "ai-email-writer", category: "ai", icon: "Mail", status: "active", seoTitle: "AI Email Writer: Draft Professional Emails Free", added: "2026-11-02", requiresFile: false, local: false,
    description: "Turn key points into a complete email with a subject line.",
    keywords: ["write email", "email generator", "draft email", "professional email"],
    content: {
      intro: "List what the email should say, pick a tone and get a subject line and full email body you can copy.",
      steps: ["Write the key points (up to 2,000 characters).", "Choose a tone.", "Press Write email and copy the subject and body."],
      method: "The AI drafts the email from your points. It is told not to invent facts, so missing details appear as placeholders such as [Name] or [Date]. The text is sent to this site's server, which forwards it to an AI model through DeskMint AI. The model is chosen by the site owner and is a free model by default, so it can be slow, busy or temporarily unavailable. Your input is not stored by DeskMint.",
      limits: ["Up to 2,000 characters of input.", "Replace any placeholders before sending.", "AI output can be wrong or incomplete; check anything important.", "Free AI models have usage limits, so you may sometimes be asked to wait and try again.", "Do not enter passwords, financial details or other sensitive information."],
      faqs: [{ q: "Can I copy the subject and body separately?", a: "Yes, each has its own copy button." }],
    },
  },
  {
    id: "ai-notes-generator", name: "AI Notes Generator", slug: "ai-notes-generator", category: "ai", icon: "NotebookPen", status: "active", seoTitle: "AI Notes Generator: Turn Text into Study Notes", added: "2026-11-02", requiresFile: false, local: false,
    description: "Convert text into structured notes with headings and key takeaways.",
    keywords: ["make notes", "study notes", "lecture notes", "meeting notes"],
    content: {
      intro: "Turn a lecture, article or meeting transcript into organised notes with headings, bullet points and key takeaways.",
      steps: ["Paste your text (up to 20,000 characters).", "Press Generate notes.", "Copy the notes."],
      method: "The AI structures only the information in your text into headings, bullets and a key-takeaways section. The text is sent to this site's server, which forwards it to an AI model through DeskMint AI. The model is chosen by the site owner and is a free model by default, so it can be slow, busy or temporarily unavailable. Your input is not stored by DeskMint.",
      limits: ["Up to 20,000 characters per request.", "Notes are plain text, not a formatted document.", "AI output can be wrong or incomplete; check anything important.", "Free AI models have usage limits, so you may sometimes be asked to wait and try again.", "Do not enter passwords, financial details or other sensitive information."],
      faqs: [{ q: "Does it add information from outside my text?", a: "It is instructed to use only your text." }],
    },
  },
  {
    id: "ai-paragraph-expander", name: "AI Paragraph Expander", slug: "ai-paragraph-expander", category: "ai", icon: "Expand", status: "active", seoTitle: "AI Paragraph Expander: Expand Short Text Online", added: "2026-11-02", requiresFile: false, local: false,
    description: "Expand a short sentence into well-structured paragraphs.",
    keywords: ["expand text", "lengthen paragraph", "elaborate text", "write more"],
    content: {
      intro: "Turn a sentence or short paragraph into two to four developed paragraphs that keep your original idea.",
      steps: ["Enter your short text (up to 3,000 characters).", "Press Expand.", "Copy the result and check the details."],
      method: "The AI adds explanation and context while keeping your intent, and is told not to invent specific statistics, quotes or facts. The text is sent to this site's server, which forwards it to an AI model through DeskMint AI. The model is chosen by the site owner and is a free model by default, so it can be slow, busy or temporarily unavailable. Your input is not stored by DeskMint.",
      limits: ["Up to 3,000 characters of input.", "Expanded text may include general statements you should verify.", "AI output can be wrong or incomplete; check anything important.", "Free AI models have usage limits, so you may sometimes be asked to wait and try again.", "Do not enter passwords, financial details or other sensitive information."],
      faqs: [{ q: "Is the result original?", a: "It is generated for you, but check it before submitting it as your own work." }],
    },
  },
  {
    id: "ai-language-explainer", name: "AI Language Explainer", slug: "ai-language-explainer", category: "ai", icon: "Lightbulb", status: "active", seoTitle: "AI Language Explainer: Explain Words and Concepts", added: "2026-11-02", requiresFile: false, local: false,
    description: "Explain difficult words, sentences and concepts in simple language.",
    keywords: ["explain word", "explain sentence", "meaning of word", "simple explanation"],
    content: {
      intro: "Enter a hard word, sentence or concept and get its meaning, a simple explanation and examples.",
      steps: ["Enter a word, sentence or concept (up to 3,000 characters).", "Choose very simple or more detailed.", "Press Explain."],
      method: "The AI answers with labelled parts: Meaning, Explanation, Examples and, if useful, Related ideas. The text is sent to this site's server, which forwards it to an AI model through DeskMint AI. The model is chosen by the site owner and is a free model by default, so it can be slow, busy or temporarily unavailable. Your input is not stored by DeskMint.",
      limits: ["Up to 3,000 characters per request.", "For exact dictionary definitions or legal and medical questions, consult an authoritative source.", "AI output can be wrong or incomplete; check anything important.", "Free AI models have usage limits, so you may sometimes be asked to wait and try again.", "Do not enter passwords, financial details or other sensitive information."],
      faqs: [{ q: "Can I paste a whole paragraph?", a: "Yes. It will explain the main idea and difficult terms." }],
    },
  },
  {
    id: "ai-pdf-summarizer", name: "AI PDF Summarizer", slug: "ai-pdf-summarizer", category: "ai", icon: "FileSearch", status: "active", seoTitle: "AI PDF Summarizer: Summarize PDF Documents Online", added: "2026-11-02", requiresFile: true, local: false,
    description: "Upload a text-based PDF and get a structured summary.",
    keywords: ["summarize pdf", "pdf summary", "pdf to summary", "chat with pdf"],
    content: {
      intro: "Upload a PDF and get a structured summary with an overview, key points, important details and next steps.",
      steps: ["Choose a text-based PDF (up to 100 MB).", "Press Summarize PDF.", "Copy the summary."],
      method: "Your browser reads the PDF's text with pdf.js; the PDF file itself is not uploaded. Only the extracted text (up to 60,000 characters) is sent for summarising. Long text is split into parts of about 6,000 characters, each part is summarised, and the notes are combined into one structured summary. The text is sent to this site's server, which forwards it to an AI model through DeskMint AI. The model is chosen by the site owner and is a free model by default, so it can be slow, busy or temporarily unavailable. Your input is not stored by DeskMint.",
      limits: ["Text-based PDFs only. Scanned or image-only PDFs are rejected because DeskMint does not do OCR.", "Only the first 60,000 characters (about 150 pages of text at most) are used; the tool tells you if the document was cut.", "Tables and layout are not preserved in the extracted text.", "AI output can be wrong or incomplete; check anything important.", "Free AI models have usage limits, so you may sometimes be asked to wait and try again.", "Do not enter passwords, financial details or other sensitive information."],
      faqs: [{ q: "Is my PDF uploaded?", a: "No. Only the extracted text is sent, to produce the summary." }],
    },
  },
  {
    id: "translator", name: "Translation Studio", slug: "translator", category: "translate", icon: "Languages", status: "active", seoTitle: "Online Translator: English, Hindi, Marathi and More", added: "2026-11-02", requiresFile: false, local: false,
    description: "Translate text between English, Hindi, Marathi and 12 other languages.",
    keywords: ["translate", "translation", "english to hindi", "hindi to english", "marathi translation", "english to marathi"],
    content: {
      intro: "Translate text between English, Hindi, Marathi, Spanish, French, German, Arabic, Portuguese, Chinese, Japanese, Korean, Bengali, Tamil, Telugu and Gujarati, with automatic language detection.",
      steps: ["Choose the source language or leave it on Detect language.", "Choose the target language and enter text (up to 5,000 characters).", "Press Translate, then copy the result."],
      method: "The text is translated by an AI model in real time using DeskMint' secure AI engine. Translations are written in each language's native script. Quality depends on the model and the language pair, and has not been verified for every pair.",
      limits: ["Up to 5,000 characters per request.", "Quality varies by language pair and model; check important translations with a fluent speaker.", "Names, idioms and technical terms may be translated imperfectly.", "AI output can be wrong or incomplete; check anything important.", "Free AI models have usage limits, so you may sometimes be asked to wait and try again.", "Do not enter passwords, financial details or other sensitive information."],
      faqs: [{ q: "Which languages are supported?", a: "The 15 languages in the menu. Others are not offered because quality has not been checked." }, { q: "Is it free?", a: "DeskMint does not charge for translations and uses a free model by default, which can be unavailable at busy times." }],
    },
  },

  // ---------- Calculators (active) ----------
  {
    id: "age-calculator", name: "Age Calculator", slug: "age-calculator", category: "calculator", icon: "CalendarClock", status: "active", seoTitle: "Age Calculator: Exact Age in Years, Months and Days", requiresFile: false, local: true, quick: true,
    description: "Exact age in years, months and days from a date of birth.",
    keywords: ["date of birth", "dob", "how old am i", "birthday"],
    content: {
      intro: "Enter a date of birth to get an exact age in years, months and days, the total days lived, and the date of the next birthday.",
      steps: ["Pick your date of birth.", "Leave 'Age on' as today, or choose another date.", "Read the result. Nothing is sent anywhere."],
      method: "Whole months are counted from the birth date using real calendar months. If the birth day does not exist in a month (for example the 31st), the last day of that month is used. Remaining days are counted from that point. Years are whole months divided by 12. For a 29 February birthday, non-leap years use 28 February for the next-birthday date.",
      example: "Born 15 Aug 2000, age on 30 Oct 2026: 26 years, 2 months, 15 days.",
      limits: ["Uses the Gregorian calendar and your device's dates without time zones.", "Dates before 1900 are rejected."],
      faqs: [{ q: "Does it handle leap years?", a: "Yes. It works on real calendar dates, so leap days are counted automatically." }, { q: "Can I calculate age on a past or future date?", a: "Yes. Change the 'Age on' date." }],
    },
  },
  {
    id: "percentage-calculator", name: "Percentage Calculator", slug: "percentage-calculator", category: "calculator", icon: "Percent", status: "active", seoTitle: "Percentage Calculator Online Free", requiresFile: false, local: true, quick: true,
    description: "Percent of a number, one number as a percent of another, and percent change.",
    keywords: ["percent", "marks percentage", "percentage of", "increase decrease"],
    content: {
      intro: "Three common percentage questions in one place: what is X% of Y, what percent is X of Y, and how much did a value change in percent.",
      steps: ["Choose the question you want to answer.", "Enter the two numbers.", "The result and the formula update immediately."],
      method: "X% of Y = Y × X / 100. X as a percent of Y = X / Y × 100. Percent change = (new − old) / |old| × 100. Results are shown rounded to at most 4 decimal places.",
      example: "Marks: 432 out of 600 is 432 / 600 × 100 = 72%.",
      limits: ["Division by zero is rejected with a message.", "Percent change from 0 is undefined."],
      faqs: [{ q: "How do I calculate percentage from marks?", a: "Choose 'X is what % of Y', enter marks obtained as X and total marks as Y." }],
    },
  },
  {
    id: "discount-calculator", name: "Discount Calculator", slug: "discount-calculator", category: "calculator", icon: "Tag", status: "active", seoTitle: "Discount Calculator: Sale Price and Savings", requiresFile: false, local: true,
    description: "Original price, discount amount and final price.",
    keywords: ["sale price", "percent off", "price after discount"],
    content: {
      intro: "See how much you save and what you pay after a percentage discount.",
      steps: ["Enter the original price.", "Enter the discount percentage.", "Read the saving and the final price."],
      method: "Discount amount = price × discount% / 100. Final price = price − discount amount. Amounts are shown to 2 decimal places.",
      example: "Price 2,499 with 15% off: saving 374.85, final price 2,124.15.",
      limits: ["Taxes, coupons and stacked discounts are not included."],
      faqs: [{ q: "Is the currency fixed?", a: "No. The calculation is currency-agnostic; enter any amount." }],
    },
  },
  {
    id: "unit-converter", name: "Unit Converter", slug: "unit-converter", category: "calculator", icon: "Ruler", status: "active", seoTitle: "Unit Converter: Length, Weight, Temperature and More", requiresFile: false, local: true,
    description: "Convert length, mass, temperature, area and volume.",
    keywords: ["convert units", "km to miles", "kg to lb", "celsius fahrenheit", "metric imperial"],
    content: {
      intro: "Convert between common units in five categories. Pick a category, choose the units and type a value.",
      steps: ["Choose a category.", "Select 'from' and 'to' units.", "Enter a value."],
      method: "Each unit has a factor to a base unit (metre, kilogram, square metre, litre). Value × from-factor ÷ to-factor gives the result. Temperature uses explicit formulas through Kelvin. Results show up to 10 significant digits.",
      example: "5 miles = 8.04672 kilometres.",
      limits: ["US customary volume units (gallon, cup) are used, not imperial ones."],
      faqs: [{ q: "Which gallon is used?", a: "The US liquid gallon (3.785411784 L)." }],
    },
  },
  {
    id: "cgpa-calculator", name: "CGPA Calculator", slug: "cgpa-calculator", category: "calculator", icon: "GraduationCap", status: "active", seoTitle: "CGPA Calculator with Percentage Conversion", requiresFile: false, local: true,
    description: "Credit-weighted CGPA from semester SGPAs, with optional percentage conversion.",
    keywords: ["cgpa to percentage", "gpa", "semester grade", "sppu", "grade point"],
    content: {
      intro: "Combine semester SGPAs into a CGPA, weighted by credits. Universities differ, so the percentage conversion is something you set yourself.",
      steps: ["Add one row per semester with its SGPA and total credits.", "Read the CGPA.", "Optionally enter your university's conversion rule to get a percentage."],
      method: "Default formula: CGPA = Σ(SGPA × credits) ÷ Σ(credits). Optional conversion: percentage = multiplier × CGPA + offset, using the values you enter. Check your university's official circular before relying on a conversion.",
      example: "SGPA 8.0 (22 credits) and 9.0 (20 credits): (176 + 180) / 42 = 8.4762.",
      limits: ["No university-specific conversion is built in yet.", "Results are for guidance, not official records."],
      faqs: [{ q: "Is this my university's official CGPA?", a: "Not necessarily. Use the figure printed on your marksheet as the official one." }],
    },
  },
  {
    id: "sgpa-calculator", name: "SGPA Calculator", slug: "sgpa-calculator", category: "calculator", icon: "BookOpen", status: "active", seoTitle: "SGPA Calculator Online Free", requiresFile: false, local: true,
    description: "Credit-weighted SGPA from subject credits and grade points.",
    keywords: ["semester gpa", "grade points", "sgpa"],
    content: {
      intro: "Enter credits and grade points for each subject to get a semester grade point average.",
      steps: ["Add a row per subject.", "Enter credits and the grade point earned.", "Read the SGPA."],
      method: "SGPA = Σ(credits × grade point) ÷ Σ(credits). Grade points are entered directly because letter-grade tables differ between universities.",
      example: "4 credits at 9, 3 credits at 8: (36 + 24) / 7 = 8.5714.",
      limits: ["Grade points must be between 0 and 10. Credit rules of your university may differ."],
      faqs: [{ q: "Why not enter letter grades?", a: "Letter-to-point tables vary by university, so you enter the points from your own grade sheet." }],
    },
  },
  {
    id: "attendance-calculator", name: "Attendance Calculator", slug: "attendance-calculator", category: "calculator", icon: "ClipboardCheck", status: "active", seoTitle: "Attendance Percentage Calculator", requiresFile: false, local: true,
    description: "Attendance percentage, classes needed to reach a target, or classes you can miss.",
    keywords: ["75 percent attendance", "classes needed", "bunk"],
    content: {
      intro: "Find your attendance percentage and how many classes you must attend, or can miss, to stay at your target.",
      steps: ["Enter classes attended and total classes held.", "Set the target percentage.", "Read the result."],
      method: "Attendance = attended / total × 100. Classes needed (attending every future class): n = ⌈(T × total − 100 × attended) / (100 − T)⌉. Classes you can miss (attending the rest): m = ⌊100 × attended / T − total⌋. Assumes every future class counts equally.",
      example: "30 of 40 classes (75%) with a target of 80%: attend 10 more in a row.",
      limits: ["A 100% target can't be recovered once a class is missed."],
      faqs: [{ q: "Does it know my college's rules?", a: "No. Condonation or medical leave rules are not modelled." }],
    },
  },
  {
    id: "date-difference", name: "Date Difference Calculator", slug: "date-difference", category: "calculator", icon: "CalendarRange", status: "active", seoTitle: "Date Difference Calculator: Days Between Dates", requiresFile: false, local: true,
    description: "Days, weeks, months and years between two dates.",
    keywords: ["days between dates", "date duration", "how many days"],
    content: {
      intro: "Find the time between two dates as total days and as years, months and days.",
      steps: ["Choose a start and an end date.", "Optionally include the end date in the count.", "Read the result."],
      method: "Total days is the difference between the two calendar dates. Years, months and days use the same calendar-month method as the Age Calculator. If the start date is after the end date they are swapped.",
      example: "1 Jan 2026 to 1 Mar 2026: 59 days, or 2 months.",
      limits: ["Dates only: time zones and daylight saving are ignored."],
      faqs: [{ q: "What does 'include end date' do?", a: "It adds one day, counting both the first and last date." }],
    },
  },

  // ---------- Text ----------
  {
    id: "word-counter", name: "Word Counter", slug: "word-counter", category: "text", icon: "Type", status: "active", seoTitle: "Word Counter and Character Counter Online", requiresFile: false, local: true, quick: true,
    description: "Words, characters, sentences, paragraphs and reading time.",
    keywords: ["character counter", "count words", "count characters", "letter count"],
    content: {
      intro: "Paste or type text to count words, characters with and without spaces, sentences, paragraphs and lines.",
      steps: ["Paste or type your text.", "Read the counts as you type.", "Use Clear to start over."],
      method: "Words are runs of non-space characters. Characters are counted as Unicode code points. Sentences are runs ending in . ! or ? and are an approximation. Reading time assumes 200 words per minute.",
      example: "\"Less time wasted.\" has 3 words and 17 characters.",
      limits: ["Sentence counts are approximate, especially with abbreviations."],
      faqs: [{ q: "Is my text uploaded?", a: "No. Counting runs in your browser." }],
    },
  },
  soon({ id: "case-converter", name: "Case Converter", description: "Switch text to upper, lower, title or sentence case.", category: "text", slug: "case-converter", keywords: ["uppercase", "lowercase", "capitalize"], icon: "CaseSensitive", requiresFile: false, local: true }),
  soon({ id: "remove-extra-spaces", name: "Remove Extra Spaces", description: "Clean up repeated spaces and blank lines.", category: "text", slug: "remove-extra-spaces", keywords: ["trim spaces", "clean text"], icon: "Eraser", requiresFile: false, local: true }),

  // ---------- Utilities ----------
  {
    id: "qr-code-generator", name: "QR Code Generator", slug: "qr-code-generator", category: "utility", icon: "QrCode", status: "active", seoTitle: "QR Code Generator Online Free", requiresFile: false, local: true, quick: true,
    description: "Create a QR code from text or a link and download it as PNG.",
    keywords: ["qr", "make qr code", "qr maker", "link to qr"],
    content: {
      intro: "Turn any text or web link into a QR code image you can download and print or share.",
      steps: ["Type or paste your text or link.", "Choose error correction and image size.", "Check the preview, then download the PNG."],
      method: "The code is generated in your browser with the open-source 'qrcode' library. Higher error-correction levels let a code survive more damage but hold less data. The image is rendered as a PNG with a 2-module quiet zone.",
      example: "Entering https://example.com produces a code that opens that address when scanned.",
      limits: ["Very long text will not fit; you will see an error instead of a broken code.", "Always test a printed code with a phone before distributing it."],
      faqs: [{ q: "Is my text sent anywhere?", a: "No. The code is created on your device." }, { q: "Does the code expire?", a: "No. It encodes the text itself, so it works as long as that text or link stays valid." }],
    },
  },
  soon({ id: "qr-code-reader", name: "QR Code Reader", description: "Read the content of a QR code image.", category: "utility", slug: "qr-code-reader", keywords: ["scan qr", "decode qr"], icon: "ScanLine", requiresFile: true, local: true }),
  soon({ id: "countdown-timer", name: "Countdown Timer", description: "Count down from a time you set.", category: "utility", slug: "countdown-timer", keywords: ["timer"], icon: "Hourglass", requiresFile: false, local: true }),
  soon({ id: "stopwatch", name: "Stopwatch", description: "Time anything with laps.", category: "utility", slug: "stopwatch", keywords: ["lap timer"], icon: "Timer", requiresFile: false, local: true }),

  // ---------- Programmatic High-Intent SEO Landing Pages ----------
  {
    id: "compress-pdf-to-100kb", name: "Compress PDF to 100KB", slug: "compress-pdf-to-100kb", category: "pdf", icon: "FileArchive", status: "active",
    seoTitle: "Compress PDF to 100KB Online Free (Exact Size)", added: "2026-11-20", requiresFile: true, local: true,
    description: "Shrink any PDF under 100 KB directly in your browser for government forms, exam portals, and college uploads.",
    keywords: ["compress pdf to 100kb", "reduce pdf size to 100kb", "pdf compressor 100kb online free", "pdf under 100kb"],
    content: {
      intro: "Reduce your PDF file size under 100 KB directly in your browser—ideal for UPSC, MPSC, SSC, scholarship, and university admission portals.",
      steps: ["Upload or drop your PDF file.", "The target limit is pre-set to 100 KB (or adjust using the slider).", "Click Compress PDF and download your optimized file."],
      method: "DeskMint runs an adaptive browser-side compression loop that shrinks embedded images first to keep text crisp, and automatically protects against size bloat.",
      example: "A 1.2 MB scanned marksheet PDF compresses cleanly under 100 KB in seconds without uploading your document to any server.",
      limits: ["Runs 100% locally in your browser up to 100 MB.", "If your PDF is already under 100 KB, the tool notifies you immediately without altering it."],
      faqs: [
        { q: "How do I compress a PDF to 100KB without losing quality?", a: "Upload your file here—our Target Size engine automatically finds the highest readable sharpness that fits under 100 KB." },
        { q: "Is my marksheet or ID PDF uploaded to a server?", a: "No. Everything runs 100% locally in your browser." },
      ],
    },
  },
  {
    id: "compress-pdf-to-200kb", name: "Compress PDF to 200KB", slug: "compress-pdf-to-200kb", category: "pdf", icon: "FileArchive", status: "active",
    seoTitle: "Compress PDF to 200KB Online Free (Fast & Local)", added: "2026-11-20", requiresFile: true, local: true,
    description: "Reduce PDF files under 200 KB in your browser with sharp readable quality for portals and job applications.",
    keywords: ["compress pdf to 200kb", "reduce pdf to 200kb", "pdf size reducer 200kb", "free pdf compress 200kb"],
    content: {
      intro: "Compress your PDF to under 200 KB with crisp readability—pre-configured for Indian exam portals, resumes, and official document uploads.",
      steps: ["Select your PDF.", "Confirm the 200 KB target limit.", "Click Compress PDF and download instantly."],
      method: "Uses multi-step browser-side optimization to hit your 200 KB limit while preserving maximum sharpness and keeping files 100% private.",
      example: "A 2.5 MB multi-page PDF report reduces to ~185 KB while staying clear and readable.",
      limits: ["100% browser-based up to 100 MB.", "Never outputs a file larger than your original."],
      faqs: [
        { q: "Is this 200KB PDF compressor completely free?", a: "Yes, unlimited free compressions with no watermark and no sign-up." },
        { q: "Will it work on mobile phones?", a: "Yes, it works smoothly in Chrome and Safari on Android and iPhone." },
      ],
    },
  },
  {
    id: "compress-pdf-to-50kb", name: "Compress PDF to 50KB", slug: "compress-pdf-to-50kb", category: "pdf", icon: "FileArchive", status: "active",
    seoTitle: "Compress PDF to 50KB Online Free", added: "2026-11-20", requiresFile: true, local: true,
    description: "Compress small single-page PDFs and certificates under 50 KB directly in your browser.",
    keywords: ["compress pdf to 50kb", "reduce pdf size to 50kb", "pdf under 50kb online"],
    content: {
      intro: "Shrink single-page certificates, receipts, and ID PDFs under 50 KB right in your browser with zero server uploads.",
      steps: ["Upload your PDF.", "Target size is pre-filled to 50 KB.", "Press Compress PDF and download."],
      method: "Iteratively tunes resolution and JPEG compression locally to approach or beat 50 KB while reporting exact before-and-after sizes.",
      limits: ["Best suited for 1–3 page documents; multi-page scans may hit a physical readability floor."],
      faqs: [
        { q: "Why can't a 20-page PDF reach 50KB?", a: "Every page needs a minimum number of bytes to stay legible. Our tool automatically gives you the smallest readable size possible." },
      ],
    },
  },
  {
    id: "compress-image-to-50kb", name: "Compress Image to 50KB", slug: "compress-image-to-50kb", category: "image", icon: "ImageDown", status: "active",
    seoTitle: "Compress Image to 50KB Online Free (JPG, PNG, WebP)", added: "2026-11-20", requiresFile: true, local: true,
    description: "Reduce passport photos and JPG/PNG images under 50 KB instantly in your browser.",
    keywords: ["compress image to 50kb", "reduce photo size to 50kb", "jpg compressor 50kb", "passport photo 50kb"],
    content: {
      intro: "Compress passport photos, signatures, and JPG/PNG images to under 50 KB for SSC, UPSC, NEET, JEE, and MHT-CET application forms.",
      steps: ["Upload your JPG, PNG, or WebP photo.", "Target Size is pre-set to 50 KB.", "Preview the crisp result and download."],
      method: "Runs a smart binary search over image quality and format locally on your device so your photo lands just under 50 KB with maximum clarity.",
      limits: ["Supports JPG, PNG, and WebP up to 50 MB.", "100% private—your photo never leaves your device."],
      faqs: [
        { q: "Can I compress a passport photo to 50KB for exam forms?", a: "Yes! Select JPG output and our tool automatically hits under 50 KB while keeping your face clear." },
      ],
    },
  },
  {
    id: "compress-image-to-20kb", name: "Compress Image to 20KB", slug: "compress-image-to-20kb", category: "image", icon: "ImageDown", status: "active",
    seoTitle: "Compress Image to 20KB Online Free (Signature & Photo)", added: "2026-11-20", requiresFile: true, local: true,
    description: "Shrink scanned signatures and photos under 20 KB for government and university exam portals.",
    keywords: ["compress image to 20kb", "signature compressor 20kb", "reduce jpg to 20kb online"],
    content: {
      intro: "Quickly compress scanned signatures and small ID photos under 20 KB in your browser without watermarks or uploads.",
      steps: ["Drop your signature or photo.", "Target Size is pre-configured to 20 KB.", "Download the ready-to-upload image."],
      method: "Automatically optimizes quality and dimensions locally to fit strictly under 20 KB.",
      limits: ["Runs 100% locally in your browser."],
      faqs: [
        { q: "Is this suitable for 10KB–20KB signature uploads?", a: "Yes, you can also type 15 KB or 10 KB into the target box for strict signature limits." },
      ],
    },
  },
  {
    id: "sppu-cgpa-to-percentage", name: "SPPU CGPA to Percentage Calculator", slug: "sppu-cgpa-to-percentage", category: "calculator", icon: "GraduationCap", status: "active",
    seoTitle: "SPPU CGPA to Percentage Calculator (Pune University 2019 & 2024)", added: "2026-11-20", requiresFile: false, local: true,
    description: "Convert Savitribai Phule Pune University (SPPU) CGPA & SGPA to percentage using the official 8.9 multiplier.",
    keywords: ["sppu cgpa to percentage", "pune university cgpa calculator", "sppu 2019 pattern percentage", "sppu sgpa to percentage"],
    content: {
      intro: "Instantly convert Savitribai Phule Pune University (SPPU) CGPA to percentage or calculate credit-weighted CGPA from semester SGPAs.",
      steps: ["Enter your SPPU CGPA in the Quick Convert box (or enter semester credits and SGPAs).", "SPPU's 8.9 multiplier is pre-selected.", "Copy your exact percentage instantly."],
      method: "Uses the SPPU CBCS/2019 & 2024 pattern conversion formula: Percentage = CGPA × 8.9 (editable if your marksheet specifies a different slab).",
      example: "An SPPU CGPA of 8.50 converts to 8.50 × 8.9 = 75.65%.",
      limits: ["Always cross-check special distinction/above-9.5 slabs on your official SPPU marksheet."],
      faqs: [
        { q: "What is the SPPU CGPA to percentage formula?", a: "For most SPPU 2019 & 2024 engineering and CBCS patterns, Percentage = CGPA × 8.9." },
        { q: "Can I calculate SPPU CGPA from semester SGPAs?", a: "Yes, enter each semester's credits and SGPA below to compute both your CGPA and percentage." },
      ],
    },
  },
  {
    id: "mumbai-university-cgpa-to-percentage", name: "Mumbai University CGPA to Percentage", slug: "mumbai-university-cgpa-to-percentage", category: "calculator", icon: "GraduationCap", status: "active",
    seoTitle: "Mumbai University CGPA to Percentage Calculator (MU 10-Point)", added: "2026-11-20", requiresFile: false, local: true,
    description: "Convert Mumbai University (MU) 10-point CGPA/CGPI to percentage accurately in seconds.",
    keywords: ["mumbai university cgpa to percentage", "mu cgpi to percentage", "mumbai university percentage calculator"],
    content: {
      intro: "Convert Mumbai University (MU) 10-point CGPA/CGPI into percentage using MU's official linear formula.",
      steps: ["Enter your MU CGPA/CGPI.", "The Mumbai University formula (7.1 × CGPA + 11) is pre-loaded.", "Adjust to 7.4 × CGPA + 12 if applicable for CGPA ≥ 7."],
      method: "Calculates Percentage = 7.1 × CGPA + 11 (or custom multiplier/offset per your MU circular).",
      example: "A Mumbai University CGPA of 8.0 gives 7.1 × 8.0 + 11 = 67.80% (or 71.20% under the 7.4×+12 circular).",
      limits: ["Mumbai University circulars vary by faculty/year; you can edit the multiplier and offset anytime."],
      faqs: [
        { q: "What is the Mumbai University CGPI to percentage formula?", a: "MU uses 7.1 × CGPI + 11 for CGPI below 7 and 7.4 × CGPI + 12 for CGPI 7 and above on the 10-point scale." },
      ],
    },
  },
  {
    id: "dbatu-cgpa-to-percentage", name: "DBATU CGPA to Percentage Calculator", slug: "dbatu-cgpa-to-percentage", category: "calculator", icon: "GraduationCap", status: "active",
    seoTitle: "DBATU CGPA to Percentage Calculator (Lonere Maharashtra)", added: "2026-11-20", requiresFile: false, local: true,
    description: "Convert Dr. Babasaheb Ambedkar Technological University (DBATU) CGPA to percentage using (CGPA - 0.5) × 10.",
    keywords: ["dbatu cgpa to percentage", "dbatu percentage calculator", "dbatu sgpa to percentage"],
    content: {
      intro: "Calculate your DBATU (Dr. Babasaheb Ambedkar Technological University, Lonere) percentage from CGPA or semester SGPAs.",
      steps: ["Type your DBATU CGPA in the Quick Convert field.", "The official (CGPA − 0.5) × 10 formula is pre-selected.", "View and copy your percentage."],
      method: "Uses DBATU's official conversion formula: Percentage = (CGPA − 0.5) × 10.",
      example: "A DBATU CGPA of 8.2 converts to (8.2 − 0.5) × 10 = 77.00%.",
      limits: ["Verify with your official DBATU transcript for placement forms."],
      faqs: [
        { q: "How is DBATU CGPA converted to percentage?", a: "Subtract 0.5 from your CGPA and multiply by 10." },
      ],
    },
  },
  {
    id: "rtmnu-cgpa-to-percentage", name: "RTMNU CGPA to Percentage Calculator", slug: "rtmnu-cgpa-to-percentage", category: "calculator", icon: "GraduationCap", status: "active",
    seoTitle: "RTMNU CGPA to Percentage Calculator (Nagpur University)", added: "2026-11-20", requiresFile: false, local: true,
    description: "Convert Rashtrasant Tukadoji Maharaj Nagpur University (RTMNU) CGPA to percentage instantly.",
    keywords: ["rtmnu cgpa to percentage", "nagpur university cgpa calculator", "rtmnu percentage formula"],
    content: {
      intro: "Instantly convert Nagpur University (RTMNU) CGPA to percentage using the (CGPA − 0.75) × 10 formula.",
      steps: ["Enter your RTMNU CGPA.", "Formula (CGPA − 0.75) × 10 is pre-selected.", "Copy your percentage result."],
      method: "Uses Percentage = (CGPA − 0.75) × 10 (editable for custom circulars).",
      example: "An RTMNU CGPA of 8.5 converts to (8.5 − 0.75) × 10 = 77.50%.",
      limits: ["Always verify against the conversion certificate issued by RTMNU."],
      faqs: [
        { q: "What is the RTMNU CGPA to percentage formula?", a: "RTMNU's standard engineering conversion is (CGPA − 0.75) × 10." },
      ],
    },
  },
  {
    id: "vtu-cgpa-to-percentage", name: "VTU CGPA to Percentage Calculator", slug: "vtu-cgpa-to-percentage", category: "calculator", icon: "GraduationCap", status: "active",
    seoTitle: "VTU CGPA to Percentage Calculator (2018, 2021 & 2022 Scheme)", added: "2026-11-20", requiresFile: false, local: true,
    description: "Convert Visvesvaraya Technological University (VTU) CGPA to percentage for CBCS and NEP schemes.",
    keywords: ["vtu cgpa to percentage", "vtu percentage calculator", "vtu sgpa to percentage"],
    content: {
      intro: "Convert VTU (Visvesvaraya Technological University, Belagavi) CGPA and SGPA to percentage quickly and accurately.",
      steps: ["Enter your VTU CGPA.", "The CBCS formula (CGPA − 0.75) × 10 is pre-loaded (set Offset to 0 for the 2021+ CGPA × 10 scheme).", "Copy your result."],
      method: "Uses (CGPA − 0.75) × 10 for 2015/2018 CBCS schemes and supports CGPA × 10 for 2021/2022 schemes.",
      example: "A VTU CBCS CGPA of 8.25 equals (8.25 − 0.75) × 10 = 75.00%.",
      limits: ["Check which scheme (2018 vs 2021+) applies to your USN."],
      faqs: [
        { q: "What is the VTU 2021 scheme CGPA to percentage formula?", a: "For the 2021+ scheme, VTU simplified the formula to CGPA × 10 (just change Offset from -7.5 to 0 above)." },
      ],
    },
  },
  {
    id: "aktu-cgpa-to-percentage", name: "AKTU CGPA to Percentage Calculator", slug: "aktu-cgpa-to-percentage", category: "calculator", icon: "GraduationCap", status: "active",
    seoTitle: "AKTU CGPA to Percentage Calculator (UPTU Official Formula)", added: "2026-11-20", requiresFile: false, local: true,
    description: "Convert AKTU (Dr. A.P.J. Abdul Kalam Technical University) CGPA to percentage accurately.",
    keywords: ["aktu cgpa to percentage", "uptu cgpa to percentage", "aktu percentage calculator"],
    content: {
      intro: "Convert your AKTU (UPTU) CGPA or semester SGPAs into percentage in one click.",
      steps: ["Enter your AKTU CGPA.", "AKTU's CGPA × 10 multiplier is pre-selected.", "Get your exact percentage instantly."],
      method: "Calculates Percentage = CGPA × 10 per AKTU's standard 10-point grading policy.",
      example: "An AKTU CGPA of 7.85 converts to 78.50%.",
      limits: ["Confirm with your official AKTU marksheet for older batches."],
      faqs: [
        { q: "How do I convert AKTU CGPA to percentage?", a: "Multiply your AKTU CGPA by 10." },
      ],
    },
  },
  {
    id: "anna-university-cgpa-to-percentage", name: "Anna University CGPA to Percentage", slug: "anna-university-cgpa-to-percentage", category: "calculator", icon: "GraduationCap", status: "active",
    seoTitle: "Anna University CGPA to Percentage Calculator (Reg 2017 & 2021)", added: "2026-11-20", requiresFile: false, local: true,
    description: "Convert Anna University CGPA to percentage using the official × 10 conversion formula.",
    keywords: ["anna university cgpa to percentage", "anna university percentage calculator", "anna university gpa calculator"],
    content: {
      intro: "Convert Anna University (Regulation 2017 & 2021) CGPA to percentage or compute your credit-weighted CGPA.",
      steps: ["Enter your Anna University CGPA.", "Official × 10 multiplier is pre-selected.", "View and copy your percentage."],
      method: "Uses Anna University's official conversion formula: Percentage = CGPA × 10.",
      example: "An Anna University CGPA of 8.64 equals 86.40%.",
      limits: ["Refer to your official Anna University grade sheet for final verification."],
      faqs: [
        { q: "What is Anna University's CGPA to percentage formula?", a: "Anna University converts CGPA to percentage by multiplying CGPA by 10." },
      ],
    },
  },
  {
    id: "gtu-cgpa-to-percentage", name: "GTU CGPA to Percentage Calculator", slug: "gtu-cgpa-to-percentage", category: "calculator", icon: "GraduationCap", status: "active",
    seoTitle: "GTU CGPA to Percentage Calculator (Gujarat Technological Univ.)", added: "2026-11-20", requiresFile: false, local: true,
    description: "Convert GTU CGPA/CPI/SPI to percentage using the official (CGPA − 0.5) × 10 formula.",
    keywords: ["gtu cgpa to percentage", "gtu cpi to percentage", "gtu percentage calculator"],
    content: {
      intro: "Convert Gujarat Technological University (GTU) CGPA, CPI, or SPI to percentage instantly.",
      steps: ["Enter your GTU CGPA/CPI.", "GTU's official (CGPA − 0.5) × 10 formula is pre-selected.", "Copy your result immediately."],
      method: "Uses GTU's official formula: Percentage = (CGPA − 0.5) × 10.",
      example: "A GTU CPI of 8.40 converts to (8.40 − 0.5) × 10 = 79.00%.",
      limits: ["Verify against GTU's official conversion circular when applying abroad."],
      faqs: [
        { q: "What is the GTU CPI to percentage formula?", a: "Percentage = (CPI − 0.5) × 10." },
      ],
    },
  },
  {
    id: "english-to-marathi-translator", name: "English to Marathi Translator", slug: "english-to-marathi-translator", category: "translate", icon: "Languages", status: "active",
    seoTitle: "Free English to Marathi Translator Online (Accurate Devanagari)", added: "2026-11-20", requiresFile: false, local: false,
    description: "Translate English text into natural, accurate Marathi in Devanagari script instantly.",
    keywords: ["english to marathi translator", "free marathi translation", "translate english to marathi online"],
    content: {
      intro: "Translate English sentences, paragraphs, and emails into natural Marathi (मराठी) written in authentic Devanagari script.",
      steps: ["Type or paste your English text.", "English → Marathi is pre-selected (click swap anytime for Marathi → English).", "Click Translate and copy your result."],
      method: "Processes your text in real time with context-aware translation that preserves tone, idioms, and native Devanagari script.",
      limits: ["Up to 5,000 characters per request.", "3 free AI uses per day; upgrade to Pro for unlimited access."],
      faqs: [
        { q: "Does it write proper Marathi Devanagari script?", a: "Yes, translations are always delivered in proper Marathi Devanagari script." },
      ],
    },
  },
  {
    id: "english-to-hindi-translator", name: "English to Hindi Translator", slug: "english-to-hindi-translator", category: "translate", icon: "Languages", status: "active",
    seoTitle: "Free English to Hindi Translator Online (Natural Hindi)", added: "2026-11-20", requiresFile: false, local: false,
    description: "Translate English to clear, natural Hindi in Devanagari script with instant copy.",
    keywords: ["english to hindi translator", "free hindi translation", "translate english to hindi online"],
    content: {
      intro: "Translate English text into fluent, natural Hindi (हिन्दी) in authentic Devanagari script.",
      steps: ["Enter your English text.", "English → Hindi is pre-selected.", "Click Translate and copy."],
      method: "Context-aware real-time translation preserving meaning, formatting, and natural Hindi phrasing.",
      limits: ["Up to 5,000 characters per request.", "3 free AI uses per day."],
      faqs: [
        { q: "Can I swap to Hindi to English?", a: "Yes, click the swap icon between the language selectors anytime." },
      ],
    },
  },
  {
    id: "hindi-to-english-translator", name: "Hindi to English Translator", slug: "hindi-to-english-translator", category: "translate", icon: "Languages", status: "active",
    seoTitle: "Free Hindi to English Translator Online (Accurate & Fast)", added: "2026-11-20", requiresFile: false, local: false,
    description: "Translate Hindi text into clear, grammatically polished English online for free.",
    keywords: ["hindi to english translator", "translate hindi to english", "free hindi english translation"],
    content: {
      intro: "Translate Hindi (हिन्दी) sentences, messages, and documents into natural, fluent English.",
      steps: ["Paste or type your Hindi text.", "Hindi → English is pre-selected.", "Click Translate and copy."],
      method: "Context-aware real-time translation engineered for natural English output.",
      limits: ["Up to 5,000 characters per request.", "3 free AI uses per day."],
      faqs: [
        { q: "Is my Hindi text stored?", a: "No. DeskMint processes your text in real time and never stores it." },
      ],
    },
  },
];

export const activeMint = tools.filter((t) => t.status === "active");
export const getTool = (slug: string) => tools.find((t) => t.slug === slug);
export const toolUrl = (t: ToolDef) => `/tools/${t.slug}`;
