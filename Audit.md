# OurStory — Application Audit

**Date:** February 12, 2026
**Auditor:** Claude Code
**App URL:** https://story.mostlyuseful.in
**Branch:** main (commit `a11b2fa`)
**Scope:** Security, architecture alignment, best practices, dead code, and general issues

---

## Summary

The codebase is **well-engineered** for a Phase 1 prototype. TypeScript is used strictly, the architecture is clean, there are no injection vulnerabilities, and the implementation actually *exceeds* several PRD requirements (Server Actions instead of API routes, proper `queries.ts`/`storage.ts` split). The app is ready for its intended use case.

There are **no critical blockers** for the Feb 19 deadline. However, there are security gaps that should be addressed before Phase 2 expansion.

---

## Section 1: PRD Alignment

### ✅ Fully Implemented

| PRD Feature | Implementation |
|---|---|
| All 5 prompt types | ✅ `multiple_choice`, `text_input`, `audio_playback`, `image_reveal`, `none` |
| Chapter limit (max 10) | ✅ `MAX_CHAPTERS = 10` in `lib/utils/constants.ts` |
| Slug generation with collision check | ✅ `lib/utils/slug.ts` uses slugify + nanoid(7) |
| Supabase Storage buckets (3) | ✅ `story-images`, `story-audio`, `final-messages` |
| Recipient one-way experience | ✅ No back navigation, sessionStorage for progress |
| `integration_template` with `[choice]`/`[response]` | ✅ `components/story/IntegrationText.tsx` |
| Final message (text/image/video/combination) | ✅ `app/dashboard/story/[storyId]/final-message/page.tsx` |
| Preview mode as recipient | ✅ `app/dashboard/preview/[storyId]/page.tsx` |
| Two distinct UX surfaces (Inter + Lora fonts) | ✅ `.theme-recipient` CSS class override |
| `ActionResult<T>` pattern | ✅ `lib/types/actions.ts` |
| SaaS-ready user_id column on all tables | ✅ `HARDCODED_USER_ID` as placeholder |
| Publish/unpublish toggle | ✅ `publishStoryAction` in `actions/story-actions.ts` |
| Mobile-first recipient experience | ✅ Responsive, Lora serif, warm palette |

### ✅ Improved Beyond PRD

| PRD Spec | Actual Implementation | Why Better |
|---|---|---|
| API routes for all mutations | Server Actions in `/actions/` | No API route boilerplate, automatic CSRF protection, type-safe calls |
| Single `storage.ts` | `queries.ts` (reads) + `storage.ts` (writes) | Clear read/write separation, Server Components can query directly |
| `framer-motion` | `motion` package | React 19 compatibility |
| `z.any()` for `prompt_config` | Discriminated union + `superRefine` | Runtime validation that config matches prompt type |

### ❌ Not Implemented (Intentional Phase 1 Deferrals)

| Feature | Status | Notes |
|---|---|---|
| `DELETE /api/upload` endpoint | Missing | PRD listed it; media deletion is via Server Action `media-actions.ts` — acceptable alternative |
| Video upload endpoint | Missing | `app/api/upload/video/route.ts` does not exist. Final message supports `video` type in DB but uploading video via UI is not wired up. See Issue #1. |
| Chapter drag-and-drop reorder | Not implemented | PRD noted "future" — acceptable |
| `PATCH /api/chapters/reorder` | Not implemented | Same as above |
| Users table | Not implemented | Phase 1 uses `HARDCODED_USER_ID`, no actual `users` table needed yet — acceptable |
| Auth / multi-user | Not implemented | Explicit Phase 1 deferral ✅ |

### ✅ Issue #1 — Video Upload (Already Handled)

**File:** `components/dashboard/FinalMessageEditor.tsx` (line 22)
**Status:** Already resolved in code. The editor explicitly excludes video via:
```typescript
type SupportedMessageType = Exclude<FinalMessageType, "video">;
```
The `TYPE_OPTIONS` array only offers `text`, `image`, and `combination`. No action needed.

---

## Section 2: Security Audit

### ✅ Secure (No Changes Needed)

| Area | Finding |
|---|---|
| SQL injection | Not possible — all DB access via Supabase JS SDK (parameterized) |
| XSS | Safe — React auto-escapes all rendered strings; no `dangerouslySetInnerHTML` anywhere |
| Markdown XSS | Safe — `react-markdown` v10 does not execute scripts; custom `components` prop limits rendered tags to `p`, `strong`, `em` |
| CSRF on Server Actions | Protected — Next.js 15 Server Actions use origin-checking by default |
| Secrets in git | Safe — `.env.local` is in `.gitignore` (line 34: `.env*`); confirmed NOT in git history |
| `NEXT_PUBLIC_` key exposure | Safe — `SUPABASE_SERVICE_ROLE_KEY` is correctly server-only (no `NEXT_PUBLIC_` prefix) |
| Published/unpublished access | Safe — `getStoryBySlug` filters `.eq("published", true)` before returning data |
| File path traversal | Low risk — Supabase Storage SDK handles paths; filenames are regenerated server-side |

### 🔴 Issue #2 — No Authentication on Dashboard (HIGH)

**Files:** `middleware.ts` (lines 3–5), all `app/dashboard/*` routes
**Issue:** The dashboard is completely unauthenticated. Anyone who discovers `story.mostlyuseful.in/dashboard` can view, create, edit, and delete all stories.

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // Phase 1: No auth required — single user prototype.
  return NextResponse.next();
}
```

**Current Risk:** For a single-user personal app shared via direct link, the risk is low — the dashboard URL is not publicly promoted. However, Vercel deployment URLs (`*.vercel.app`) are guessable and crawled.
**Recommendation for Phase 2:** Implement Supabase Auth. The middleware is already structured for this. For an immediate stopgap before Phase 2, consider adding HTTP Basic Auth via a Vercel middleware or restricting the `/dashboard` path in Vercel's project settings.

---

### 🔴 Issue #3 — No Authentication or Rate Limiting on Upload Routes (HIGH)

**Files:** `app/api/upload/image/route.ts`, `app/api/upload/audio/route.ts`
**Issue:** Both upload routes:
1. Have no auth check — anyone can POST files
2. Have no rate limiting — open to storage quota exhaustion
3. Accept a `storyId` form field but do not validate it belongs to the requester

```typescript
// app/api/upload/image/route.ts
export async function POST(request: NextRequest) {
  const formData = await request.formData(); // No auth check
  // ...uploads directly to Supabase Storage
}
```

**Attack scenario:** A bot discovers the upload endpoint, uploads thousands of 5MB images, exhausting the free-tier Supabase Storage quota (1GB on free plan) and potentially incurring costs.

**Recommendations:**
- Add a basic secret token check as a short-term fix:
  ```typescript
  const token = request.headers.get("x-upload-token");
  if (token !== process.env.UPLOAD_SECRET_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  ```
- Validate `storyId` is a valid UUID format before using it in the storage path
- For Phase 2: tie upload auth to Supabase session

---

### 🟡 Issue #4 — File Extension Derived from User-Supplied Filename (MEDIUM)

**Files:** `app/api/upload/image/route.ts` (line ~51), `app/api/upload/audio/route.ts` (line ~49)
**Issue:** The file extension is extracted from `file.name` which is browser-supplied:

```typescript
const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
const filename = `${fileType}-${Date.now()}.${ext}`;
```

A user could upload a file named `exploit.html.jpg` and the extension would be `jpg` (mitigated), but they could also send `exploit.php` which stores as `exploit.php` in Supabase Storage. Supabase Storage doesn't execute files, so this has no RCE risk, but it is sloppy.

**Recommendation:** Derive the extension from the validated MIME type, not from the filename:
```typescript
const mimeExtMap: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
  "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/wav": "wav",
};
const ext = mimeExtMap[file.type] ?? "bin";
```

---

### 🟡 Issue #5 — No Ownership Check in Update/Delete Operations (MEDIUM, Phase 2)

**Files:** `lib/data/storage.ts` (lines ~38–92), `actions/story-actions.ts`, `actions/chapter-actions.ts`
**Issue:** All update/delete operations use only the resource `id`, not `user_id`:

```typescript
// lib/data/storage.ts
const { data, error } = await supabase
  .from("stories")
  .update(input)
  .eq("id", id);  // ← No .eq("user_id", userId) check
```

**Phase 1 Risk:** Low — all data belongs to `HARDCODED_USER_ID`.
**Phase 2 Risk:** High — when multi-user launches, an attacker can modify/delete any user's stories by knowing the story UUID. UUIDs are v4 random (hard to guess) but story IDs appear in dashboard URLs.

**Recommendation for Phase 2:** Add `.eq("user_id", userId)` to all update/delete queries in `lib/data/storage.ts`, and pass the authenticated user's ID from Server Actions.

---

### 🟢 Issue #6 — No HTTP Security Headers (LOW)

**File:** `next.config.ts`
**Issue:** No `Content-Security-Policy`, `X-Frame-Options`, or `X-Content-Type-Options` headers are configured.
**Recommendation:** Add to `next.config.ts`:

```typescript
headers: async () => [
  {
    source: "/:path*",
    headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ],
  },
],
```

---

### 🟢 Issue #7 — Error Messages May Leak DB Details (LOW)

**Files:** All Server Actions (e.g., `actions/story-actions.ts` line ~45)
**Issue:** Raw exception messages are returned to the client:

```typescript
error: e instanceof Error ? e.message : "Failed to create story",
```

Supabase errors can include schema details (e.g., `"duplicate key value violates unique constraint 'stories_slug_key'"`), which reveals table/column names.
**Recommendation for Phase 2:** Log the full error server-side, return a generic message to the client:
```typescript
console.error("[createStory]", e);
return { success: false, error: "Failed to create story. Please try again." };
```

---

## Section 3: Best Practices

### ✅ Strong Points

- **TypeScript strictness:** Full strict mode, no `any` types detected, discriminated unions for `PromptConfig`
- **Validation:** Zod schemas on all inputs, `superRefine` for conditional prompt config validation
- **Error boundaries:** `error.tsx` files for both dashboard and recipient routes
- **Cache invalidation:** `revalidatePath()` correctly called after all mutations
- **Accessibility:** `aria-invalid`, semantic HTML, `alt` text on images, `MotionConfig reducedMotion="user"`
- **`<img>` vs `<Image>`:** Uses plain `<img>` for dynamic Supabase URLs (correct — Next.js `<Image>` requires known dimensions), with proper ESLint disable comments
- **No `dangerouslySetInnerHTML`:** Confirmed absent throughout the codebase

### 🟡 Issue #8 — Missing `.env.example` File (LOW)

**Issue:** There is no `.env.example` documenting required environment variables. This is a standard practice for collaborative or open-source projects.
**Recommendation:** Create `.env.example` at the project root:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

### 🟡 Issue #9 — `console.error` Is the Only Logging Mechanism (LOW)

**Issue:** All error logging uses `console.error()`. In production on Vercel, these appear in function logs but have no structured format, alerting, or retention.
**Recommendation for Phase 2:** Integrate a lightweight error tracking service (Sentry has a generous free tier and a Next.js SDK) before launching to real users.

---

### 🟡 Issue #10 — No Tests (LOW for Phase 1)

**Issue:** No unit, integration, or E2E tests exist. The PRD acknowledged this as acceptable for Phase 1.
**Recommendation before Phase 2:** Add at minimum:
- Unit tests for `lib/utils/slug.ts`, `lib/utils/validation.ts`
- Integration tests for critical Server Actions
- E2E with Playwright for the recipient flow (most important user journey)

---

## Section 4: Redundant & Dead Code

### ✅ No Significant Dead Code Found

The codebase is tight. No obviously unused components, exports, or files were identified. Specific observations:

| File | Note |
|---|---|
| `middleware.ts` | Contains auth scaffolding comments for Phase 2 — intentionally kept as a placeholder |
| `lib/supabase/service.ts` | Used only by server-side operations — appropriate separation |
| `lib/types/actions.ts` | `ActionResult<T>` type — used consistently throughout |

### 🟡 Issue #11 — `next-env.d.ts` Referenced in `.gitignore` but Committed (INFO)

`next-env.d.ts` is auto-generated by Next.js and typically should be in `.gitignore` (line 41 of `.gitignore` confirms it's ignored). Confirm it's not tracked:
```bash
git ls-files next-env.d.ts
```
If it appears, remove it from tracking: `git rm --cached next-env.d.ts`.

---

### 🟡 Issue #12 — PRD API Routes Never Implemented (INFO, Not a Bug)

The PRD specified REST API routes (`/api/stories`, `/api/stories/[id]`, etc.). These were intentionally replaced with Server Actions — a better pattern. However, the `app/api/` directory only has `upload/image` and `upload/audio`. The absent routes are not dead code, just a valid architectural deviation. This is documented in `CLAUDE.md`.

---

## Section 5: Other Issues

### 🟡 Issue #13 — Story Title Uniqueness Check Not Enforced (MEDIUM)

**PRD reference:** Part 2, Section 1.1: "Title must be unique (check against existing stories)"
**Files:** `lib/utils/validation.ts`, `lib/data/storage.ts`
**Issue:** The Zod schema does not validate title uniqueness (it can't — that requires a DB query). The storage layer does not check for title uniqueness before inserting. Two stories with identical titles can exist.
**Impact:** Low for Phase 1 (single user, few stories). Could cause confusion.
**Recommendation:** Add a DB check in `createStory()` or a unique constraint on `(user_id, title)` in the database.

---

### 🟡 Issue #14 — `sessionStorage` Progress Tracking Will Be Lost on New Device (INFO)

**File:** `app/s/[slug]/page.tsx` and recipient-side components
**Issue:** The PRD states "Progress saved in session (if they close and reopen)." This is implemented via `sessionStorage`, which is per-tab and cleared when the browser tab closes. A recipient who shares the link across devices or reopens the browser will start from the beginning.
**Phase 1 Assessment:** Acceptable — the recipient experience is designed to be completed in one sitting.
**Phase 2 consideration:** For longer stories, consider persisting progress server-side (a `chapter_views` table or similar).

---

### 🟢 Issue #15 — Supabase `remotePatterns` Is Permissive (LOW)

**File:** `next.config.ts`
**Issue:** The `remotePatterns` for Next.js Image optimization allows `*.supabase.co`:
```typescript
{ protocol: "https", hostname: "*.supabase.co" }
```
This allows any Supabase project's images, not just this project's. Low risk since this only affects image optimization proxying, not data access.
**Recommendation:** Narrow to the specific project hostname: `xnenrwsozvcxbanxozlh.supabase.co`.

---

### 🟢 Issue #16 — No Input `.trim()` on Story Title and Recipient Name (LOW)

**File:** `lib/utils/validation.ts`
**Issue:** Zod schemas validate length but don't trim whitespace:
```typescript
title: z.string().min(1).max(100)  // " " passes validation
```
A title of `"   "` (spaces only) would pass `min(1)` and be stored.
**Recommendation:** Add `.trim()` to string fields in validation schemas:
```typescript
title: z.string().trim().min(1, "Title is required").max(100)
```

---

## Summary Table

| # | Severity | Category | Issue | Status |
|---|---|---|---|---|
| 1 | ~~MEDIUM~~ | PRD Alignment | Video upload not wired | ✅ Already handled in code |
| 2 | HIGH | Security | No dashboard authentication | Deferred to Phase 2 (single-user) |
| 3 | HIGH | Security | Upload routes unauthenticated + no rate limit | ✅ **Fixed** — secret token added |
| 4 | MEDIUM | Security | File extension from user-supplied filename | Deferred to Phase 2 |
| 5 | MEDIUM | Security | No ownership check in storage operations | Deferred to Phase 2 |
| 6 | LOW | Security | No HTTP security headers | Deferred |
| 7 | LOW | Security | Error messages leak DB details | Deferred to Phase 2 |
| 8 | LOW | Best Practice | Missing `.env.example` | Deferred |
| 9 | LOW | Best Practice | No structured logging | Deferred to Phase 2 |
| 10 | LOW | Best Practice | No tests | Deferred to Phase 2 |
| 11 | INFO | Dead Code | `next-env.d.ts` tracking check | No issue found |
| 12 | INFO | PRD Alignment | PRD API routes replaced by Server Actions | No action — intentional improvement |
| 13 | MEDIUM | PRD Alignment | Story title uniqueness not enforced | Deferred |
| 14 | INFO | Architecture | sessionStorage progress lost on new device | Acceptable Phase 1 |
| 15 | LOW | Security | Supabase `remotePatterns` too broad | ✅ **Fixed** — narrowed to project hostname |
| 16 | LOW | Best Practice | No `.trim()` on string inputs | ✅ **Fixed** — added to Zod schemas |

---

## Recommended Actions by Deadline

### Before Feb 19 (Story Launch Day)
1. **Issue #3** — Add a secret token header check to upload routes (30 min)
2. **Issue #16** — Add `.trim()` to Zod string schemas (15 min)
3. **Issue #1** — Either add the video upload route or hide the "video" final message option

### Before Phase 2 Launch
1. **Issue #2** — Implement Supabase Auth in middleware
2. **Issue #5** — Add `user_id` ownership filters in all storage write operations
3. **Issue #4** — Derive file extensions from MIME type in upload routes
4. **Issue #13** — Enforce story title uniqueness at DB level
5. **Issue #7** — Sanitize error messages returned to clients

### Nice to Have (Any Time)
- Issues #6, #8, #9, #10, #15 — low-effort hardening and hygiene improvements

---

*Generated by Claude Code — OurStory Application Audit — Feb 12, 2026*
