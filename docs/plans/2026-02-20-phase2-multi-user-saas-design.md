# Phase 2 Design: Multi-User SaaS Launch

**Date:** 2026-02-20
**Status:** Approved
**PRD:** PRDs/PRD_OurStory_Phase2.md

---

## Decisions (PRD Deviations)

| PRD Says | Decision | Reason |
|----------|----------|--------|
| Add `auth_user_id` column | Reuse existing `user_id` | No redundant columns |
| Add `paid` boolean column | Use `published_at IS NOT NULL` | Two columns sufficient |
| $12 (timeline checkpoint) | $6 per publish | PRD pricing section is authoritative |
| 4 themes at launch | 2 themes: Romantic + Modern | Ship faster, add more post-launch |
| Google OAuth | Email + Magic Link only | Add OAuth post-launch |
| Marketing landing page at `/` | Dashboard-first with anonymous auth | Zero-friction onboarding |
| Unlimited chapters | Keep MAX_CHAPTERS = 10 | Prevents abuse, existing limit |
| "Created with OurStory" footer | No watermark/attribution | Clean recipient experience |
| Payment required to publish | Beta: free publish, payments hidden behind `STRIPE_ENABLED` env var | Beta launch is free; flip env var to activate payments |
| Require signup before dashboard | Anonymous auth, signup on publish | Better conversion funnel |
| Email verification blocks access | Verify later, use app immediately | Reduce friction |

---

## 1. Auth & User Model

### Approach: Anonymous Auth → Signup on Publish

Supabase Anonymous Auth creates a real `auth.users` row with an anonymous flag. When the user signs up, `linkIdentity()` promotes the anonymous session to a real account. The `user_id` stays the same — all data is preserved.

### Flow

```
Visitor lands on /
  → Middleware: no session? → create anonymous Supabase session
  → Redirect to /dashboard

User creates stories, adds chapters, previews
  → All saved to DB with anonymous user_id (RLS works normally)

User clicks "Publish" or leaves page
  → Auth modal: "Sign up to save your story"
  → Email+Password or Magic Link
  → linkIdentity() promotes anonymous → real account
  → user_id unchanged, all data preserved
```

### Auth Methods
- Email + Password (primary)
- Magic Link (passwordless email)
- Google OAuth: deferred post-launch

### Auth Pages
- `/login` — email/password + magic link toggle
- `/signup` — create account form
- `/auth/callback` — magic link & email verification redirect

### Code Changes
- **Remove `HARDCODED_USER_ID`** from `lib/utils/constants.ts` and all references (2 files: `storage.ts`, `dashboard/page.tsx`)
- **Middleware:** Create anonymous session if none exists, protect nothing (anonymous users can access dashboard)
- **Service client → User client:** Switch `queries.ts` and `storage.ts` from `createServiceClient()` to user-scoped Supabase client so RLS applies
- **Auth modal component:** Reusable, appears when anonymous user tries to publish
- **Email verification:** Supabase sends email automatically. User can continue using app. No blocking verification page.

### What We Don't Build
- Google OAuth
- Custom password reset page (Supabase default)
- Profile/settings page (Phase 3)
- Account deletion flow (Phase 3)

---

## 2. Database & RLS

### Schema Changes (stories table)

```sql
-- Add payment tracking
ALTER TABLE stories
  ADD COLUMN published_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN stripe_payment_id TEXT DEFAULT NULL,
  ADD COLUMN stripe_checkout_session_id TEXT DEFAULT NULL;

-- Add theme support (2 themes at launch)
ALTER TABLE stories
  ADD COLUMN theme TEXT DEFAULT 'romantic'
    CHECK (theme IN ('romantic', 'modern'));

-- Update user_id to reference auth.users
-- (existing column, just adding FK constraint)
ALTER TABLE stories
  ADD CONSTRAINT stories_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id);
```

### RLS Policies

```sql
-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_completions ENABLE ROW LEVEL SECURITY;

-- Stories: owner can CRUD
CREATE POLICY "Users manage own stories" ON stories
  FOR ALL USING (auth.uid() = user_id);

-- Stories: public can read published
CREATE POLICY "Public reads published stories" ON stories
  FOR SELECT USING (published = true);

-- Chapters: owner can CRUD via story ownership
CREATE POLICY "Users manage own chapters" ON chapters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM stories WHERE stories.id = chapters.story_id AND stories.user_id = auth.uid())
  );

-- Chapters: public reads published story chapters
CREATE POLICY "Public reads published chapters" ON chapters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stories WHERE stories.id = chapters.story_id AND stories.published = true)
  );

-- Story completions: anyone can insert (recipients), owner can read
CREATE POLICY "Anyone inserts completions" ON story_completions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Owner reads completions" ON story_completions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM stories WHERE stories.id = story_completions.story_id AND stories.user_id = auth.uid())
  );
```

### Data Migration
- Create Shakeb's real account via Supabase Auth
- `UPDATE stories SET user_id = '<real-uuid>' WHERE user_id = '00000000-0000-0000-0000-000000000001';`

### Not Adding
- `paid` boolean column (redundant with `published_at IS NOT NULL`)
- `auth_user_id` column (reusing existing `user_id`)

---

## 3. Monetization (Stripe Pay-Per-Publish)

### Price: $6 per story publish (one-time)

### Flow

```
User clicks "Publish" in story editor
  ↓
Anonymous user? → Show auth modal → signup/login → continue
  ↓
story.published_at IS NOT NULL? → Free update, no Stripe
  ↓
First publish:
  → Show PublishDialog with validation checklist + "$6 one-time" messaging
  → User clicks "Pay & Publish"
  → Server Action: createCheckoutSession(storyId)
  → Redirect to Stripe-hosted checkout page
  → User pays on Stripe
  → Stripe redirects to /dashboard/story/[storyId]?payment=success
  ↓
Webhook: checkout.session.completed
  → Set published = true
  → Set published_at = NOW()
  → Set stripe_payment_id, stripe_checkout_session_id
  → Generate slug (existing logic)
  → Story is live at /s/[slug]
```

### Re-publish (free updates)
If `published_at` is set, clicking "Publish" updates the story instantly. No Stripe, no payment. The existing `publishStoryAction` handles this — just add the `published_at` check.

### New Files
- `/lib/stripe.ts` — Stripe client initialization
- `/app/api/webhooks/stripe/route.ts` — Webhook handler for `checkout.session.completed`
- Server Action in `/actions/story-actions.ts`: `createCheckoutSessionAction(storyId)`

### Updated Files
- `PublishDialog.tsx` — Conditional UI: first publish shows price, re-publish is free
- `StoryEditorHeader.tsx` — Handle `?payment=success` query param (show success toast)

### Environment Variables
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Edge Cases
- Payment fails → story stays unpublished, user can retry
- Webhook arrives before redirect → success page checks DB, shows published state
- Duplicate webhooks → idempotent (check if `stripe_checkout_session_id` already set)
- User refreshes during checkout → Stripe session expires after 24h, user can start new one

---

## 4. Theme System

### 2 Themes at Launch

**Romantic** (existing `.theme-recipient`):
- Colors: Rose, cream, warm gold (oklch)
- Font: Lora (serif)
- Feel: Intimate, literary

**Modern** (new):
- Colors: Teal, gray, coral (oklch)
- Font: Inter (sans-serif, already loaded)
- Feel: Clean, contemporary

### Implementation

1. **Rename** `.theme-recipient` → `.theme-romantic` in `globals.css`
2. **Add** `.theme-modern` CSS class with new variables
3. **Dynamic class** in `/app/s/[slug]/page.tsx`: `className={theme-${story.theme}}`
4. **Update** `/app/s/layout.tsx` — remove hardcoded `.theme-recipient`, let page apply theme
5. **Theme selector** in create story form + story settings page
6. **Preview** in dashboard uses selected theme

### CSS Architecture
Both themes override the same CSS custom properties. Components use variables — no theme-specific conditionals in JSX.

```css
.theme-romantic {
  --background: oklch(0.99 0.005 85);
  --foreground: oklch(0.25 0.04 50);
  --primary: oklch(0.68 0.19 10);
  --font-body: var(--font-serif);
  /* ... */
}

.theme-modern {
  --background: oklch(0.98 0.005 200);
  --foreground: oklch(0.20 0.02 250);
  --primary: oklch(0.60 0.15 180);
  --font-body: var(--font-sans);
  /* ... */
}
```

### Dashboard Not Themed
Dashboard always uses `:root` CSS variables (slate/indigo). Only the recipient experience (`/s/[slug]`) and preview (`/dashboard/preview/[storyId]`) apply story themes.

---

## 5. Navigation & Landing

### No Marketing Landing Page

Visitors go straight to the dashboard:
```
/ → middleware → anonymous session created → /dashboard
```

### Top Navigation Bar
- **Anonymous user:** "Log In" / "Sign Up" buttons
- **Authenticated user:** Email display + "Log Out" button
- Consistent across all dashboard pages

### Auth-Gated Actions
- **Publish** → requires real (non-anonymous) account
- **Page leave with unsaved story** → consider prompting signup (nice-to-have, not MVP)

---

## 6. Dashboard Updates

### Story Cards
- Title, occasion, chapter count (existing)
- Theme indicator — small colored dot matching theme palette
- Status: "Draft" / "Published" (existing)
- "Completed" badge (existing)
- Last edited timestamp (add)

### Publish Dialog (Updated)

**First publish (never paid):**
```
Publish Your Story
─────────────────
✓ At least one chapter
✓ All chapters have paragraph text
✓ Final message configured

Publishing creates a permanent shareable link.
You can edit anytime after publishing for free.

One-time payment: $6

[Pay & Publish]  [Cancel]
```

**Re-publish (already paid):**
```
Update Your Story
─────────────────
Your changes will be live immediately
at your shareable link.

[Update Story]  [Cancel]
```

---

## 7. File Changes Summary

### New Files
```
/app/login/page.tsx                    — Login page
/app/signup/page.tsx                   — Signup page
/app/auth/callback/route.ts           — Auth callback handler
/app/api/webhooks/stripe/route.ts     — Stripe webhook
/lib/stripe.ts                        — Stripe client
/components/shared/AuthModal.tsx       — Signup/login modal for anonymous users
/components/shared/NavBar.tsx          — Top navigation with auth state
/components/dashboard/ThemeSelector.tsx — Theme picker for story creation/settings
```

### Modified Files
```
middleware.ts                          — Anonymous session creation, remove root redirect
lib/utils/constants.ts                 — Remove HARDCODED_USER_ID
lib/data/queries.ts                    — Switch to user-scoped client
lib/data/storage.ts                    — Switch to user-scoped client, remove HARDCODED_USER_ID
lib/types/story.ts                     — Add published_at, theme, stripe fields to Story interface
lib/utils/validation.ts                — Add theme to story schema
actions/story-actions.ts               — Add createCheckoutSessionAction, update publishStoryAction
app/globals.css                        — Rename .theme-recipient → .theme-romantic, add .theme-modern
app/layout.tsx                         — Add NavBar component
app/page.tsx                           — Remove redirect (middleware handles it)
app/s/layout.tsx                       — Remove hardcoded .theme-recipient
app/s/[slug]/page.tsx                  — Apply dynamic theme class
app/dashboard/page.tsx                 — Remove HARDCODED_USER_ID, use session
app/dashboard/create/page.tsx          — Add theme selector to create form
components/dashboard/PublishDialog.tsx  — Conditional first-publish vs re-publish UI
components/dashboard/StoryEditorHeader.tsx — Handle payment success query param
components/dashboard/CreateStoryForm.tsx   — Add theme field
components/dashboard/StoryCard.tsx         — Add theme indicator
```

### Database (Supabase SQL Editor)
- ALTER stories table (4 new columns + FK constraint)
- Enable RLS on stories, chapters, story_completions
- Create 6 RLS policies
- Migrate existing data to real user ID
- Enable anonymous auth in Supabase dashboard
