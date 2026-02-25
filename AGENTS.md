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
- AI uses Vercel AI SDK v6 (`ai` package) with `@ai-sdk/google` provider and Gemini 2.5 Flash model.
- The API route (`app/api/agent/route.ts`) uses `streamText` with `toUIMessageStreamResponse()`. Messages from the client (`UIMessage[]`) must be converted via `convertToModelMessages()` before passing to `streamText`.
- The chat panel uses `useChat` from `@ai-sdk/react` with a `DefaultChatTransport` configured for `/api/agent`. The default endpoint is `/api/chat`, so the custom transport is required.
- Tool calls execute on the server (with `execute` functions) and are mirrored on the client via `executeToolOnClient()` in `lib/tools.ts` which maps tool names to FortuneSheet imperative API calls.
- Multi-session chat is managed in Zustand (session metadata only); `useChat` manages per-session messages keyed by session ID.
- All styling must use CSS variables from `app/globals.css` (oklch color tokens). Do not hardcode color values.

### Environment Variables
- `GOOGLE_GENERATIVE_AI_API_KEY` — Required for AI functionality. Set in `.env.local`.

### Package Manager
Use **bun** exclusively. Never use npm, yarn, or pnpm. The lockfile is `bun.lock`.

### Gotchas
- **Zod version**: Must use Zod v3 (`zod@3`), not v4. The AI SDK `tool()` function's TypeScript generics break with Zod v4 schemas.
- **FortuneSheet CSS**: Imported inside client component `components/spreadsheet.tsx`. Cannot be imported from a Server Component.
- **Model availability**: Gemini model names change frequently. If the current model (`gemini-2.5-flash`) becomes unavailable, list available models at `https://generativelanguage.googleapis.com/v1beta/models?key=$GOOGLE_GENERATIVE_AI_API_KEY` and update `app/api/agent/route.ts`.
