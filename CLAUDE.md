# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**OurStory** is a Next.js 15.5 web application where a creator builds multi-chapter interactive stories with embedded prompts and media, then shares them via a unique link. Phase 1 targets a single user (Shakeb) creating one story for his wife by Feb 19, 2026. Architecture is intentionally SaaS-ready for Phase 2 multi-user expansion.

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # TypeScript/ESLint
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Tech Stack (Actual)

- **Next.js** 15.5.12 (App Router)
- **React** 19.1
- **TypeScript** 5.x (strict mode)
- **Tailwind CSS** 4.x (oklch color space, `@theme inline` syntax)
- **shadcn/ui** (New York style, Slate base, CSS variables, lucide icons)
- **Supabase** (`@supabase/supabase-js` 2.x + `@supabase/ssr` 0.8.x)
- **Zod** 4.x (validation schemas shared client/server)
- **React Hook Form** 7.x + `@hookform/resolvers` 5.x
- **motion** 12.x (NOT `framer-motion` — renamed for React 19 compat)
- **nanoid** 5.x (slug suffix generation)
- **sonner** (toast notifications)
- **react-markdown** 10.x (paragraph rendering in recipient experience)
- **Fonts:** Inter (dashboard) + Lora (recipient, serif)

## Architecture

### Two distinct UX surfaces

1. **Creator Dashboard** (`/dashboard/*`) — Desktop-first, professional UI (Inter font, slate/indigo palette). Uses shadcn components directly.
2. **Recipient Experience** (`/s/[slug]`) — Mobile-first (portrait), intimate storytelling UI (Lora serif font, warm rose/cream palette via `.theme-recipient` CSS class, motion animations). One-way flow, no back navigation.

### Data flow (Server Actions, NOT API routes)

```
Server Component → lib/data/queries.ts → Supabase (reads)
Client Component → Server Action (/actions/*) → lib/data/storage.ts → Supabase (writes)
```

**Key decision:** We use Server Actions for all mutations instead of API routes. Only 2 Route Handlers exist — media uploads (`/api/upload/image`, `/api/upload/audio`) because they need binary FormData streaming.

- Read-only queries live in `lib/data/queries.ts` (called directly by Server Components)
- Write operations live in `lib/data/storage.ts` (called by Server Actions in `/actions/`)
- UI components never call Supabase directly

### Key structural decisions

- **Auth is bypassed in Phase 1** — `user_id` is always `HARDCODED_USER_ID` from `lib/utils/constants.ts`. `middleware.ts` auth guards are prepared for Phase 2.
- **`prompt_config` is JSONB** — The shape changes based on `prompt_type`. Use the discriminated union `PromptConfig` type from `lib/types/story.ts`. Validation uses `superRefine` in `lib/utils/validation.ts` to ensure config matches type.
- **Supabase Storage paths** follow the pattern `{bucket}/{story_id}/{filename}` — delete media when replacing to avoid orphaned files.
- **Slugs** are generated from story title + nanoid(7) suffix on publish. Collision check before saving. Logic in `lib/utils/slug.ts`.
- **Theming** — Dashboard uses `:root` CSS variables (slate). Recipient uses `.theme-recipient` class that overrides the same CSS variables with warm rose/cream palette. shadcn components automatically adapt.
- **`ActionResult<T>`** — All Server Actions return `{ success: true, data: T } | { success: false, error: string }` from `lib/types/actions.ts`.

### Key files

```
/lib/data/queries.ts             → Read-only DB operations (Server Components call directly)
/lib/data/storage.ts             → Write DB operations (Server Actions call these)
/lib/supabase/client.ts          → Browser Supabase client (createBrowserClient)
/lib/supabase/server.ts          → Server-side Supabase client (createServerClient + cookies)
/lib/utils/validation.ts         → Zod schemas for all inputs (shared client/server)
/lib/utils/constants.ts          → HARDCODED_USER_ID, MAX_CHAPTERS, upload limits
/lib/utils/slug.ts               → Slug generation (slugify + nanoid)
/lib/types/story.ts              → TypeScript types (Story, Chapter, PromptConfig union)
/lib/types/actions.ts            → ActionResult<T> type

/actions/story-actions.ts        → Server Actions for story CRUD + publish
/actions/chapter-actions.ts      → Server Actions for chapter CRUD
/actions/media-actions.ts        → Server Actions for media deletion

/app/dashboard/page.tsx                              → Story list
/app/dashboard/create/page.tsx                       → Create story form
/app/dashboard/story/[storyId]/page.tsx              → Story editor (chapter list + toolbar)
/app/dashboard/story/[storyId]/chapter/[chapterOrder]/page.tsx → Chapter editor
/app/dashboard/story/[storyId]/final-message/page.tsx → Final message editor
/app/dashboard/preview/[storyId]/page.tsx            → Preview as recipient
/app/s/[slug]/page.tsx                               → Public recipient experience

/app/api/upload/image/route.ts   → Image upload Route Handler
/app/api/upload/audio/route.ts   → Audio upload Route Handler

/components/dashboard/*          → Creator-facing components
/components/story/*              → Recipient-facing components
/components/ui/*                 → shadcn/ui components
/components/shared/*             → Shared across both surfaces
```

### Prompt types

Chapters support 5 `prompt_type` values: `multiple_choice`, `text_input`, `audio_playback`, `image_reveal`, `none`. The `prompt_config` JSONB must match the corresponding interface in `lib/types/story.ts`. `integration_template` on multiple-choice and text-input types uses `[choice]` / `[response]` placeholders to weave the recipient's answer into the next paragraph display.

### Storage buckets

| Bucket | Contents |
|---|---|
| `story-images` | Chapter images + background images |
| `story-audio` | Audio files for audio_playback prompts |
| `final-messages` | Final message image/video |

Buckets are public-read / authenticated-write.

### Recipient experience flow

Landing → Begin → Chapter (paragraph → prompt interaction → chapter image reveal → Continue) × N → Final Message

Maximum 10 chapters per story. Session progress tracked via `sessionStorage` (client-side, no DB writes in Phase 1).

## Phase 2 expansion notes

To add multi-user auth: add auth checks in `middleware.ts`, filter all `queries.ts`/`storage.ts` by `userId` from session, enable Supabase RLS. The `user_id` column is already on all tables. Server Actions already have the `ActionResult` pattern for auth error handling.
