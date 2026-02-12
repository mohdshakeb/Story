# OurStory Phase 1 - Implementation Plan

## Context

Shakeb is building **OurStory**, a web app to create interactive multi-chapter stories with prompts, media, and a final message, shared via unique links. Phase 1 is a single-user prototype for his wife by Feb 19, 2026. Architecture is SaaS-ready for Phase 2 multi-user expansion.

---

## 1. Proposed PRD Changes (All Accepted)

### 1A. Replace API Routes with Server Actions

| PRD Endpoint | Changed To | Status |
|---|---|---|
| `GET /api/stories` | Direct fetch in Server Component | ✅ |
| `POST /api/stories` | Server Action `createStoryAction()` | ✅ |
| `GET /api/stories/[id]` | Direct fetch in Server Component | ✅ |
| `PATCH /api/stories/[id]` | Server Action `updateStoryAction()` | ✅ |
| `DELETE /api/stories/[id]` | Server Action `deleteStoryAction()` | ✅ |
| `POST /api/stories/[id]/publish` | Server Action `publishStoryAction()` | ✅ |
| `POST /api/stories/[storyId]/chapters` | Server Action `createChapterAction()` | ✅ |
| `PATCH /api/chapters/[id]` | Server Action `updateChapterAction()` | ✅ |
| `DELETE /api/chapters/[id]` | Server Action `deleteChapterAction()` | ✅ |
| `DELETE /api/upload` | Server Action `deleteMediaAction()` | ✅ |
| `POST /api/upload/image` | **Keep as Route Handler** | ✅ |
| `POST /api/upload/audio` | **Keep as Route Handler** | ✅ |
| `GET /api/public/story/[slug]` | Direct fetch in `/s/[slug]/page.tsx` | ✅ (stub) |

### 1B. Schema Improvements

1. ✅ **Fix `prompt_config` validation** — `superRefine` validates `prompt_config` matches `prompt_type`
2. ✅ **Add `updated_at` trigger** — In SQL migration script
3. ✅ **Make Final Message its own route** — `/dashboard/story/[storyId]/final-message/page.tsx`

### 1C. Missing Pieces in PRD

| Missing Item | Status |
|---|---|
| Error boundaries (`error.tsx`) | ⬜ Day 7 |
| Loading states (`loading.tsx`) | ✅ Dashboard loading.tsx done, others Day 3+ |
| Custom 404 for `/s/[slug]` | ⬜ Day 6 |
| Open Graph metadata | ⬜ Day 6 |
| Image optimization (`next/image`) | ⬜ Use in components as built |
| Session progress (`sessionStorage`) | ⬜ Day 6 |
| Paragraph rendering (`react-markdown`) | ⬜ Day 6 |
| Reduced motion | ⬜ Day 6-7 |

---

## 2. Tech Stack (Actual vs Plan)

| Planned | Actual | Note |
|---|---|---|
| `tailwindcss` 3.4.x | 4.x | Next.js 15.5 scaffolds v4 by default; works fine |
| `zod` 3.x | 4.x | Core API compatible |
| `@hookform/resolvers` 3.x | 5.x | Latest compatible version |
| `react-markdown` 9.x | 10.x | Latest |
| `@supabase/ssr` 0.5.x | 0.8.x | Latest |
| `cn.ts` separate file | In `lib/utils.ts` | shadcn generated it there |
| — | `lib/supabase/service.ts` added | Service role client for server-side ops |

Everything else matches the plan.

---

## 3. Step-by-Step Implementation Plan

### Day 1 (Feb 12): Project Init + Foundation ✅ COMPLETE

**Morning — Project Setup:**
- [x] 1. `npx create-next-app@latest` with TypeScript, Tailwind, ESLint, App Router
- [x] 2. Install all dependencies (supabase, zod, react-hook-form, motion, nanoid, shadcn, sonner, react-markdown, lucide-react)
- [x] 3. `npx shadcn@latest init` + add all 13 UI components
- [x] 4. Configure fonts (Inter + Lora) in root layout
- [x] 5. Configure `next.config.ts` (`remotePatterns` for Supabase)
- [x] 6. Create `.env.local`

**Afternoon — Supabase + Core Lib:**
- [ ] 7. ⚠️ **USER ACTION**: Run SQL schema in Supabase SQL Editor + create 3 storage buckets (story-images, story-audio, final-messages as Public)
- [x] 8. Create `/lib/supabase/client.ts` + `/lib/supabase/server.ts`
- [x] 9. Create `/lib/types/story.ts` (all TypeScript interfaces + discriminated union)
- [x] 10. Create `/lib/types/actions.ts` (`ActionResult<T>`)
- [x] 11. Create `/lib/utils/validation.ts` (Zod schemas with `superRefine` prompt_config validation)
- [x] 12. Create `/lib/utils/constants.ts`, `/lib/utils/slug.ts`, `lib/utils.ts` (cn)

**Checkpoint:** `npm run dev` works ✅, Supabase connection — needs DB tables first.

---

### Day 2 (Feb 13): Data Layer + Server Actions + Dashboard Shell

**Morning — Data Layer:**
- [x] 13. Build `/lib/data/queries.ts` — `getStories()`, `getStory()`, `getStoryBySlug()`, `getChapters()`, `getChapter()`, `getChapterByOrder()`, `slugExists()`
- [x] 14. Build `/lib/data/storage.ts` — `createStory()`, `updateStory()`, `deleteStory()`, `publishStory()`, `unpublishStory()`, `createChapter()`, `updateChapter()`, `deleteChapter()`, `deleteStorageFile()`
- [x] 15. Build `/actions/story-actions.ts` + `/actions/chapter-actions.ts` + `/actions/media-actions.ts` — all Server Actions with Zod validation + `revalidatePath`
- [x] 15b. Build `/lib/supabase/service.ts` (service role client — added, not in original plan)
- [x] 15c. Build `/app/api/upload/image/route.ts` + `/app/api/upload/audio/route.ts` (pulled forward from Day 4)
- [x] 15d. Create page stubs for all routes (create, story editor, chapter editor, final message, preview, recipient)

**Afternoon — Dashboard Shell + Story List:**
- [x] 16. `globals.css` with Tailwind directives + both theme CSS variables (done Day 1)
- [x] 17. Root `layout.tsx`, redirect `page.tsx`, dashboard `layout.tsx` (done Day 1)
- [x] 18. Build `StoryCard.tsx`, `StoryGrid.tsx`, `EmptyState.tsx`
- [x] 19. Update `/dashboard/page.tsx` to fetch stories from Supabase + render StoryGrid/EmptyState
- [x] 19b. Add `StoryWithCount` type to `lib/types/story.ts`

**Checkpoint:** ✅ Dashboard loads and shows EmptyState when no stories. StoryGrid renders cards when stories exist.

**Build status:** ✅ `npm run build` passes cleanly (all 9 routes, /dashboard now 13.7kB with full component bundle)

---

### Day 3 (Feb 14): Create Story + Story Editor

**Morning — Create Story:**
- [x] 20. Build `CreateStoryForm.tsx` (React Hook Form + Zod + Server Action submit)
- [x] 21. Build `/dashboard/create/page.tsx` (currently placeholder stub)

**Afternoon — Story Editor:**
- [x] 22. Build `ChapterListItem.tsx`, `ChapterList.tsx` (with add/delete chapter)
- [x] 23. Build `StoryEditorHeader.tsx` (title, status badge, action buttons)
- [x] 24. Build `PublishDialog.tsx` (validation checklist + link copy)
- [x] 25. Build `/dashboard/story/[storyId]/page.tsx` + `not-found.tsx` + `loading.tsx`

**Checkpoint:** ✅ Can create story, see it in list, navigate to editor, add chapters.

**Build status:** ✅ `npm run build` passes cleanly (9 routes, /dashboard/create 44.1kB, /dashboard/story/[storyId] 7.8kB)

---

### Day 4 (Feb 15): Chapter Editor + Media Uploads *(most complex day)*

**Morning — Chapter Editor:**
- [x] 26. Build `PromptTypeSelector.tsx` (tabs for 5 types)
- [x] 27. Build `PromptConfigEditor.tsx` (dynamic sub-forms per prompt type)
- [x] 28. Build `MediaUploader.tsx` (file picker, upload state, preview, replace/remove)
- [x] 29. Build `ChapterEditorForm.tsx` (orchestrates all sections)

**Afternoon — Wire Up:**
- [x] 30. Build `/api/upload/image/route.ts` + `/api/upload/audio/route.ts` (**done early in Day 2**)
- [x] 31. Build `/actions/media-actions.ts` (**done early in Day 2**)
- [x] 32. Build `/dashboard/story/[storyId]/chapter/[chapterOrder]/page.tsx` (currently placeholder stub)

**Checkpoint:** ✅ Full chapter editing — paragraph, all 5 prompt types, images/audio uploaded, data persists.

**Build status:** ✅ `npm run build` passes cleanly (chapter editor route at 7.53kB / 171kB first load)

---

### Day 5 (Feb 16): Final Message + Publish + Preview

**Morning:**
- [x] 33. Build `FinalMessageEditor.tsx` (type selector, dynamic form — text/image/combination; video skipped per cut list)
- [x] 34. Build `/dashboard/story/[storyId]/final-message/page.tsx`

**Afternoon:**
- [x] 35. Complete `publishStoryAction` — server-side completeness validation (chapters, paragraph text, final message type) + slug generation + collision check
- [x] 36. `PublishDialog.tsx` was already complete from Day 3 — wired and working
- [x] 37. Build `/dashboard/preview/[storyId]/layout.tsx` + `page.tsx` (recipient theme, static chapter/final-message preview; interactive experience in Day 6)
- [x] Bonus: Fixed Zod v4 deprecation warnings — `error.flatten()` → `z.flattenError(error)` in story-actions.ts

**Checkpoint:** ✅ Can configure final message, publish, get shareable link, preview.

**Build status:** ✅ `npm run build` passes cleanly (11 routes, /dashboard/story/[storyId]/final-message 5.63kB)

---

### Day 6 (Feb 17): Recipient Experience *(most critical day)*

**Morning — Landing + Container:**
- [x] 38. Build `/s/[slug]/page.tsx` with `generateMetadata()` + `notFound()` handling
- [x] 38b. Build `/app/s/layout.tsx` — applies `.theme-recipient` to all `/s/*` pages
- [x] 39. Build `/s/[slug]/not-found.tsx` (warm branded 404)
- [x] 40. Build `StoryLanding.tsx` (staggered entrance animations, Begin button)
- [x] 41. Build `StoryExperience.tsx` (state machine: landing → chapter[prompt→revealed] → final, sessionStorage progress, AnimatePresence transitions)

**Afternoon — Chapters + All Prompts:**
- [x] 42. Build `ParagraphDisplay.tsx` (react-markdown) + `IntegrationText.tsx` (template substitution)
- [x] 43. Build `PromptInteraction.tsx` (discriminated-union dispatcher)
- [x] 44. Build `MultipleChoicePrompt.tsx`, `TextInputPrompt.tsx`, `AudioPlaybackPrompt.tsx`, `ImageRevealPrompt.tsx`
- [x] 45. Build `ChapterImage.tsx` (scale reveal), `ContinueButton.tsx` (animated), `ProgressIndicator.tsx` (pill dots)
- [x] 46. `AnimatePresence mode="wait"` chapter transitions wired in `StoryExperience`
- [x] Bonus: Preview page updated to use `StoryExperience` — pixel-perfect creator preview

**Checkpoint:** ✅ Full recipient flow — landing through all prompt types to continue.

**Build status:** ✅ `npm run build` passes cleanly (/s/[slug] 188kB, includes motion + react-markdown)

---

### Day 7 (Feb 18): Final Message Display + Polish + Deploy

**Morning:**
- [ ] 47. Build `FinalMessage.tsx` (handles all 4 message types with dramatic entrance animation)
- [ ] 48. Build `MarkdownRenderer.tsx`, `ImageWithFallback.tsx`
- [ ] 49. Polish all animations (reduced motion, GPU-accelerated, timing)

**Afternoon:**
- [ ] 50. Edge cases: no image chapters, prompt_type 'none', single chapter story, long text
- [ ] 51. Error boundaries (`error.tsx` for dashboard + recipient)
- [ ] 52. Dashboard polish: unsaved changes warning, toast feedback, loading states
- [ ] 53. Responsive testing at all breakpoints
- [ ] 54. Deploy to Vercel (push to GitHub, connect, env vars, verify build)

**Checkpoint:** Full E2E on deployed URL. Test on actual phone.

---

### Day 8 (Feb 19): Content + QA + Ship

- [ ] 55. Create the actual story content in deployed dashboard
- [ ] 56. Upload all images and media
- [ ] 57. QA: iOS Safari, Android Chrome, all prompt types, images, audio, navigation, 404, OG preview
- [ ] 58. Bug fixes + redeploy
- [ ] 59. Share the link

---

## 4. If Running Behind — Cut List (in order)

1. Background image support (skip entirely)
2. Video in final message (text + image only)
3. Dashboard mobile responsiveness (creator uses desktop)
4. Audio playback prompt type (focus on MC, text input, image reveal, none)
5. Integration templates (show paragraph without response weaving)

---

## 5. Verification Plan

1. **Unit check:** Each day's checkpoint passes before moving on
2. **Full flow test:** After Day 6, test complete flow: create → add chapters → configure prompts → upload media → final message → publish → open link → complete experience
3. **Device test:** After deploy (Day 7), test on real iPhone + Android
4. **Link preview test:** Share link in iMessage/WhatsApp, verify OG card renders
5. **Edge case sweep:** Invalid slug 404, unpublished story blocked, session resume on page reload

---

## Progress Summary

| Day | Status | Key Output |
|---|---|---|
| Day 1 | ✅ Complete (except DB setup) | Project scaffolded, types, validation, constants, supabase clients |
| Day 2 | ✅ Complete | Data layer, server actions, API routes, page stubs, StoryCard/Grid/EmptyState, dashboard page wired to Supabase |
| Day 3 | ✅ Complete | Create story form + story editor |
| Day 4 | ✅ Complete | Chapter editor + media uploader |
| Day 5 | ✅ Complete | Final message editor + publish validation + preview layout |
| Day 6 | ✅ Complete | Full recipient experience — landing, all 5 prompt types, chapter transitions |
| Day 7 | ⬜ Not started | Polish + deploy |
| Day 8 | ⬜ Not started | Content + QA + ship |

**No active blockers.** Ready for Day 6 (recipient experience).
