# DeskMint design system (Premium Redesign)

## Tokens (`src/app/globals.css`, exposed in `tailwind.config.ts`)
Colours are RGB channels on `:root` (light) and `.dark`. Components use semantic names only: `bg`, `surface`, `surface2`, `soft`, `line`, `fg`, `muted`, `accent`, `accent2`, `onaccent`, plus status colours `ok`, `warn`, `danger`, `info`, `disabled`. Focus rings use `accent`.

| Token | Light | Dark |
|---|---|---|
| bg | #F7F8FC | #111827 |
| surface | #FFFFFF | #1F2937 |
| surface2 | #F1F4FA | #273449 |
| fg | #172033 | #F8FAFC |
| muted | #64748B | #A8B3C5 |
| accent | #5267E8 | #8292FF |
| accent2 | #7185F5 | #A5B0FF |
| line | #E5E9F2 | #374151 |

## Theme
`layout.tsx` runs a tiny inline script before paint: saved choice from `localStorage('theme')`, otherwise the system preference. `ThemeToggle` flips the `dark` class and saves the choice. Colour transitions are 0.2 s and are disabled under `prefers-reduced-motion`.

## Components
`.btn`, `.btn-primary`, `.btn-ghost`, `.input`, `.panel`, `.chip`, `.label`, `.eyebrow` (globals.css); `ToolCard` (`compact` variant for directories); `Dropzone`, `DownloadList`, `useDownloads` (`file-ui.tsx`); `Result` (with optional Copy button), `Spinner`, `ErrorMsg`, `NumInput`, `Select` (`tools/ui.tsx`).

## Content rules
- Upload hints read their limits from the real constants (`MAX_PDF_BYTES`, `MAX_IMAGE_BYTES`).
- Footer shows Contact only when `NEXT_PUBLIC_CONTACT_EMAIL` is set.
- Guides on the homepage link to the `#how-to` section of real tool pages; no separate guide pages exist.
- Developer and AI categories are not shown as active because they have no tools.
