# Plan: Save, View, & Export Completed Stories

## Context

Currently, recipient answers live only in `sessionStorage` — lost when the tab closes, and deliberately cleared on story completion. The creator has no visibility into whether a recipient has finished the story or what they answered. There's no way to preserve or share the completed story.

**Goal:** Three interconnected features:
1. **Persist answers** — switch to `localStorage` so progress survives tab close
2. **Save & view completed story** — recipient chooses to save; creator sees completion badge and can view the finished story
3. **Export as images** — recipient can export chapters as styled images for social media

## Design Decisions (confirmed with user)

| Aspect | Decision |
|---|---|
| Sync timing | On save only (not after each chapter) — recipient taps "Save My Story" |
| Completion UX | After final message: two buttons — "Save My Story" + "Reset" |
| After save | "Reset" disappears permanently; export becomes available |
| Reset behavior | Clears localStorage, back to landing page; DB record is NOT created |
| Creator notification | Visual "Completed" badge on dashboard (not real-time) |
| Creator view | Same `/s/[slug]` URL renders the completed story from DB |
| Reset vs creator | Creator always keeps the last saved completion (DB preserved) |
| Export format | Both 9:16 (Story) and 1:1 (Square) — recipient chooses |
| Export content | Full chapter: title + paragraph + integration text + chapter image |

## Recipient Flow (after this change)

```
Landing → Begin → Chapters (interact/scroll) → Final Message
                                                    ↓
                                          ┌─────────────────────┐
                                          │  "Save My Story"    │  ← syncs to DB
                                          │  "Reset"            │  ← clears localStorage
                                          └─────────────────────┘
                                                    ↓ (after save)
                                          ┌─────────────────────┐
                                          │  Completed view     │
                                          │  "Share Your Story" │  ← export images
                                          └─────────────────────┘
```

**Page load priority:**
1. `localStorage.saved === true` → completed view + export
2. `localStorage` has in-progress data → resume story at saved chapter
3. No localStorage → check DB for completion → if found, completed view + export
4. Nothing → landing page

## Implementation

### Step 1: Database — `story_completions` table

Create in Supabase dashboard:
```sql
create table story_completions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references stories(id) on delete cascade,
  answers jsonb not null default '{}',
  completed_at timestamptz not null default now(),
  unique(story_id)
);
```
One completion per story (Phase 1 = one recipient). Upsert on re-save.

### Step 2: Types — `StoryCompletion` interface

**File:** `lib/types/story.ts`
- Add `StoryCompletion` interface:
  ```ts
  export interface StoryCompletion {
    id: string;
    story_id: string;
    answers: Record<string, string>;
    completed_at: string;
  }
  ```
- Update `StoryWithCount` to include optional `is_completed: boolean` for dashboard badge

### Step 3: Data layer — queries + storage

**File:** `lib/data/queries.ts`
- Add `getStoryCompletion(storyId: string): Promise<StoryCompletion | null>` — fetches from `story_completions`
- Add `getStoryCompletionBySlug(slug: string): Promise<StoryCompletion | null>` — for the recipient page load (joins stories → story_completions on slug)
- Modify `getStories()` to left-join `story_completions` and return `is_completed` boolean on each `StoryWithCount`

**File:** `lib/data/storage.ts`
- Add `saveStoryCompletion(storyId: string, answers: Record<string, string>): Promise<StoryCompletion>` — upserts into `story_completions`

### Step 4: Server action — `saveStoryCompletionAction`

**File:** `actions/story-actions.ts`
- Add `saveStoryCompletionAction(storyId: string, answers: Record<string, string>): Promise<ActionResult<StoryCompletion>>`
- Validates that storyId exists and is published
- Calls `saveStoryCompletion()` from storage
- Revalidates `/dashboard` so the badge appears

### Step 5: Persistence — `sessionStorage` → `localStorage`

**File:** `components/story/StoryExperience.tsx`

Change the three helper functions at the top:
- `saveProgress()`: use `localStorage` instead of `sessionStorage`
- `loadProgress()`: use `localStorage` instead of `sessionStorage`
- `clearProgress()`: use `localStorage` instead of `sessionStorage`

Update `SavedProgress` interface:
```ts
interface SavedProgress {
  chapterIndex: number;
  answers: Record<string, string>;
  saved?: boolean; // true after "Save My Story" was tapped
}
```

### Step 6: StoryExperience — completion buttons + completed view

**File:** `components/story/StoryExperience.tsx`

Add new prop:
```ts
interface StoryExperienceProps {
  story: Story;
  completion?: StoryCompletion | null; // from DB, passed by Server Component
}
```

**New state:**
- `isSaved: boolean` — tracks if story has been saved to DB

**On mount (updated load logic):**
```ts
useEffect(() => {
  const local = loadProgress(story.id);
  if (local?.saved) {
    // Saved locally — show completed view
    setPhase("story");
    setIsSaved(true);
    // Set all chapters revealed with stored answers
    ...
  } else if (local && local.chapterIndex > 0) {
    // In-progress — restore as before
    ...
  } else if (completion) {
    // No local state, but DB has completion — show completed view
    setPhase("story");
    setIsSaved(true);
    // Set all chapters revealed with completion.answers
    ...
  }
  // else: landing page (default)
}, [story.id, completion]);
```

**Completed view rendering:**
When `isSaved === true`:
- All chapters rendered with `revealedCount = chapters.length + 1` (shows final message)
- All entrance animations skipped (`initial={false}`)
- No prompts rendered (all in "revealed" state)
- No chevrons
- Scroll starts at top

**After final message (not yet saved):**
When `showFinal && !isSaved`:
- Render "Save My Story" button (primary, prominent) + "Reset" button (ghost/outline, subtle)

**"Save My Story" handler:**
```ts
const handleSave = async () => {
  const result = await saveStoryCompletionAction(story.id, answers);
  if (result.success) {
    setIsSaved(true);
    saveProgress(story.id, { ...currentProgress, saved: true });
  }
};
```

**"Reset" handler:**
```ts
const handleReset = () => {
  clearProgress(story.id);
  setPhase("landing");
  setRevealedCount(1);
  setChapterStates({});
  setAnswers({});
};
```

**After save (isSaved === true):**
- "Save My Story" + "Reset" buttons replaced with "Share Your Story" button
- Tapping "Share Your Story" opens the export sheet

### Step 7: Recipient page — pass completion prop

**File:** `app/s/[slug]/page.tsx`

Update the Server Component to fetch completion data:
```ts
export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);
  if (!story) notFound();

  const completion = await getStoryCompletionBySlug(slug);
  return <StoryExperience story={story} completion={completion} />;
}
```

### Step 8: Dashboard — completion badge

**File:** `lib/types/story.ts`
- Add `is_completed?: boolean` to `StoryWithCount`

**File:** `lib/data/queries.ts`
- Modify `getStories()` to left-join `story_completions` and compute `is_completed`

**File:** `components/dashboard/StoryCard.tsx`
- Add a "Completed" badge (green, with CheckCircle2 icon) next to "Published" badge when `story.is_completed`
- Add "View Completed" button in the dropdown menu → links to `/s/[slug]`

### Step 9: Export — `StoryExport` component

**New file:** `components/story/StoryExport.tsx`

A bottom sheet/dialog that:
1. Shows format toggle: "Story (9:16)" / "Square (1:1)"
2. Generates chapter card images using `html-to-image`
3. Offers share (Web Share API on mobile) or download (desktop)

**Approach:**
- Install `html-to-image` package
- For each chapter, render a hidden `ExportChapterCard` component with fixed dimensions
- Pre-fetch Supabase images as data URLs (avoids CORS issues with `html-to-image`)
- Capture each card with `toPng()` from `html-to-image`
- On mobile: use `navigator.share({ files: [...] })` to open native share sheet
- On desktop: download individually via anchor tags with `download` attribute

### Step 10: Export — `ExportChapterCard` component

**New file:** `components/story/ExportChapterCard.tsx`

A fixed-size card component styled for image export (not for screen display):
- Warm cream background (recipient theme colors)
- Dimensions: 1080x1920 (9:16) or 1080x1080 (1:1)
- Layout per card:
  - Top: chapter number/title in small caps
  - Middle: paragraph text + integration text (answer woven in, highlighted)
  - Bottom: chapter image (if exists), cropped to fit
  - Footer: subtle OurStory branding
- Uses inline styles (not Tailwind) for reliable `html-to-image` capture
- Font: Lora (serif) — must be loaded via `@font-face` in the hidden render container

### Step 11: Install dependency

```bash
npm install html-to-image
```

## Files Summary

| File | Change |
|---|---|
| `lib/types/story.ts` | Add `StoryCompletion`, update `StoryWithCount` |
| `lib/data/queries.ts` | Add `getStoryCompletion`, `getStoryCompletionBySlug`, modify `getStories` |
| `lib/data/storage.ts` | Add `saveStoryCompletion` |
| `actions/story-actions.ts` | Add `saveStoryCompletionAction` |
| `components/story/StoryExperience.tsx` | `sessionStorage` → `localStorage`, add `completion` prop, save/reset/completed view logic |
| `app/s/[slug]/page.tsx` | Fetch + pass `completion` prop |
| `components/dashboard/StoryCard.tsx` | Add "Completed" badge + "View Completed" menu item |
| `components/story/StoryExport.tsx` | **New** — export bottom sheet with format toggle + image generation |
| `components/story/ExportChapterCard.tsx` | **New** — fixed-size card template for image export |

## Verification

1. **Supabase**: Create `story_completions` table with the SQL above
2. `npm run build` — no TypeScript errors
3. `npm run dev` — test full flow:
   - Play through story → final message shows "Save My Story" + "Reset"
   - Tap "Reset" → back to landing, no DB record
   - Play through again → tap "Save My Story" → buttons change to "Share Your Story"
   - Close tab, reopen `/s/[slug]` → completed view shows (from localStorage)
   - Open in incognito → completed view shows (from DB)
   - Dashboard → "Completed" badge visible on story card
   - Dashboard → "View Completed" opens the `/s/[slug]` completed view
4. Export test:
   - Tap "Share Your Story" → format toggle appears
   - Select 9:16 → generates chapter images → share/download works
   - Select 1:1 → same
   - Verify images include: title, paragraph, integration text, chapter image, branding
5. Mobile viewport (375px) — primary target for both completed view and export
