# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview
This is **Cursor for Excel** — a Next.js 16 app with a split-pane interface: FortuneSheet spreadsheet (left) + AI chat panel (right). Uses Bun as package manager.

### Running the App
- **Dev server**: `bun run dev` — starts on `http://localhost:3000`
- **Build**: `bun run build`
- **Lint**: `bun run lint`
- Standard commands are in `package.json` `scripts`.

### Key Architecture Notes
- FortuneSheet (`@fortune-sheet/react`) is client-side only — must use `next/dynamic` with `ssr: false` wrapped in a `"use client"` component. Direct usage in Server Components will fail.
- The FortuneSheet imperative API is accessed via a ref stored in `lib/store.ts` (`getWorkbookApi()`). Tool calls in `lib/tools.ts` use this to manipulate cells programmatically.
- AI is **not connected yet** — the chat uses a mock agent (`executeMockAgent` in `lib/tools.ts`) that pattern-matches on keywords to execute predefined templates.
- All styling must use CSS variables from `app/globals.css` (oklch color tokens). Do not hardcode color values.

### Package Manager
Use **bun** exclusively. Never use npm, yarn, or pnpm. The lockfile is `bun.lock`.

### FortuneSheet CSS
The FortuneSheet CSS (`@fortune-sheet/react/dist/index.css`) is imported inside the client component `components/spreadsheet.tsx`. It cannot be imported from a Server Component.
