# Phase 2: Multi-User SaaS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform OurStory from a single-user prototype into a multi-user SaaS with anonymous-first auth, Stripe pay-per-publish ($6), and a 2-theme system.

**Architecture:** Anonymous Supabase sessions let visitors create stories immediately. Signup is prompted only at publish time. RLS policies enforce data isolation. Stripe Checkout handles one-time $6 payments per story publish. Two CSS-variable-based themes (Romantic, Modern) are applied dynamically on the recipient experience.

**Beta Mode:** Payment is built but hidden behind `STRIPE_ENABLED=false` env var. During beta, publishing is free (no Stripe UI shown to users). Flip to `true` to activate payments. Stripe code is fully built and testable locally by setting `STRIPE_ENABLED=true` in `.env.local`.

**Tech Stack:** Next.js 15.5, Supabase Auth (anonymous + email/password + magic link), Stripe Checkout Sessions + Webhooks, Tailwind CSS v4 themes via CSS custom properties.

**Design Doc:** `docs/plans/2026-02-20-phase2-multi-user-saas-design.md`

---

## Task Overview

| # | Task | Scope |
|---|------|-------|
| 1 | Database migrations & RLS policies | Supabase SQL |
| 2 | Enable anonymous auth in Supabase | Dashboard config |
| 3 | Update TypeScript types & validation schemas | `lib/types/`, `lib/utils/` |
| 4 | Switch data layer from service client to user-scoped client | `lib/data/` |
| 5 | Middleware: anonymous session creation | `middleware.ts` |
| 6 | Auth pages: login, signup, callback | `app/login/`, `app/signup/`, `app/auth/` |
| 7 | Auth modal for anonymous users | `components/shared/AuthModal.tsx` |
| 8 | NavBar with auth state | `components/shared/NavBar.tsx`, `app/layout.tsx` |
| 9 | Update dashboard to use session user | `app/dashboard/page.tsx` |
| 10 | Update storage layer: remove HARDCODED_USER_ID | `lib/data/storage.ts` |
| 11 | Update server actions: add auth checks | `actions/story-actions.ts`, `actions/chapter-actions.ts` |
| 12 | Stripe integration: client + checkout action | `lib/stripe.ts`, `actions/story-actions.ts` |
| 13 | Stripe webhook handler | `app/api/webhooks/stripe/route.ts` |
| 14 | Update publish flow: payment gate | `PublishDialog.tsx`, `StoryEditorHeader.tsx` |
| 15 | Theme system: CSS + database | `globals.css`, `app/s/` |
| 16 | Theme selector in story creation | `CreateStoryForm.tsx`, `StoryCard.tsx` |
| 17 | Landing page redirect & root route | `app/page.tsx`, `middleware.ts` |
| 18 | Migrate existing data | Supabase SQL |
| 19 | Environment variables & Stripe setup | `.env.local`, Vercel |
| 20 | End-to-end testing & verification | Manual QA |

---

## Task 1: Database Migrations & RLS Policies

**Files:**
- Create: `sql/phase2-migration.sql` (reference file, execute in Supabase SQL Editor)

**Context:** The `stories` table currently has a `user_id` column set to a hardcoded UUID. We need to add payment/theme columns, create a foreign key to `auth.users`, and enable RLS.

**Step 1: Write the migration SQL**

Create `sql/phase2-migration.sql`:

```sql
-- Phase 2 Migration: Multi-User SaaS
-- Run in Supabase SQL Editor

-- ============================================
-- 1. Enable Anonymous Auth
-- ============================================
-- Do this in Supabase Dashboard > Authentication > Settings >
-- Enable "Allow anonymous sign-ins"

-- ============================================
-- 2. Add columns to stories table
-- ============================================

-- Payment tracking
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_payment_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT DEFAULT NULL;

-- Theme support (2 themes at launch)
ALTER TABLE stories
  ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'romantic'
    CHECK (theme IN ('romantic', 'modern'));

-- ============================================
-- 3. Add foreign key to auth.users
-- ============================================
-- Note: This will fail if user_id values don't exist in auth.users.
-- Run Task 18 (data migration) BEFORE this if existing data exists.

-- Only add if constraint doesn't exist:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stories_user_id_auth_fkey'
  ) THEN
    ALTER TABLE stories
      ADD CONSTRAINT stories_user_id_auth_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END $$;

-- ============================================
-- 4. Enable Row Level Security
-- ============================================
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_completions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS Policies for stories
-- ============================================

-- Owner can do everything with their own stories
CREATE POLICY "Users manage own stories" ON stories
  FOR ALL USING (auth.uid() = user_id);

-- Anyone can read published stories (recipient experience)
CREATE POLICY "Public reads published stories" ON stories
  FOR SELECT USING (published = true);

-- ============================================
-- 6. RLS Policies for chapters
-- ============================================

-- Owner can manage chapters of their own stories
CREATE POLICY "Users manage own chapters" ON chapters
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = chapters.story_id
      AND stories.user_id = auth.uid()
    )
  );

-- Anyone can read chapters of published stories
CREATE POLICY "Public reads published chapters" ON chapters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = chapters.story_id
      AND stories.published = true
    )
  );

-- ============================================
-- 7. RLS Policies for story_completions
-- ============================================

-- Anyone can insert completions (recipients saving their answers)
CREATE POLICY "Anyone inserts completions" ON story_completions
  FOR INSERT WITH CHECK (true);

-- Anyone can read completions for published stories
CREATE POLICY "Public reads completions for published stories" ON story_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_completions.story_id
      AND stories.published = true
    )
  );

-- Owner can read completions for their own stories
CREATE POLICY "Owner reads own completions" ON story_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stories
      WHERE stories.id = story_completions.story_id
      AND stories.user_id = auth.uid()
    )
  );

-- ============================================
-- 8. Storage policies (for media uploads)
-- ============================================
-- Ensure storage buckets allow authenticated uploads (including anonymous users)
-- Check Supabase Dashboard > Storage > Policies
-- Each bucket needs:
--   SELECT: public (already set in Phase 1)
--   INSERT: authenticated (auth.role() = 'authenticated')
--   UPDATE: authenticated (auth.role() = 'authenticated')
--   DELETE: authenticated (auth.role() = 'authenticated')
```

**Step 2: Review SQL for correctness**

Read through the SQL carefully. Check:
- No `paid` column (we use `published_at IS NOT NULL` instead)
- No `auth_user_id` column (reusing existing `user_id`)
- Theme CHECK constraint only allows 'romantic' and 'modern'
- RLS policies cover all CRUD operations

**Step 3: USER ACTION — Run migration in Supabase**

> **Manual step:** Copy the SQL into Supabase SQL Editor and execute. Verify no errors.

**Step 4: Commit**

```bash
git add sql/phase2-migration.sql
git commit -m "feat: add Phase 2 database migration SQL (payment, theme, RLS)"
```

---

## Task 2: Enable Anonymous Auth in Supabase

**Files:** None (Supabase Dashboard configuration)

**Step 1: USER ACTION — Enable anonymous sign-ins**

> In Supabase Dashboard:
> 1. Go to Authentication > Settings > Auth Providers
> 2. Enable "Allow anonymous sign-ins"
> 3. Save

**Step 2: USER ACTION — Configure email auth**

> In Supabase Dashboard:
> 1. Go to Authentication > Settings > Email
> 2. Ensure "Enable Email Signup" is ON
> 3. Ensure "Enable Email Confirmations" is ON (users can still use app, just sends verification email)
> 4. Configure SMTP if desired (or use Supabase's built-in email for development)

**Step 3: Verify**

Test in the Supabase client explorer or via `curl` that anonymous sign-in works:
```
supabase.auth.signInAnonymously()
```

---

## Task 3: Update TypeScript Types & Validation Schemas

**Files:**
- Modify: `lib/types/story.ts` (lines 46-62 — Story interface)
- Modify: `lib/utils/validation.ts` (lines 33-46 — CreateStorySchema)
- Modify: `lib/utils/constants.ts` (line 2 — remove HARDCODED_USER_ID)

**Context:** The `Story` interface needs new fields for payment tracking and theme. The create schema needs a theme field. The hardcoded user ID constant should be removed.

**Step 1: Update Story interface**

In `lib/types/story.ts`, add new fields to the `Story` interface:

```typescript
export interface Story {
  id: string;
  user_id: string;
  title: string;
  slug: string | null;
  occasion: string | null;
  anniversary_number: number | null;
  recipient_name: string | null;
  final_message_type: FinalMessageType | null;
  final_message_content: string | null;
  final_message_media_url: string | null;
  og_image_url: string | null;
  published: boolean;
  published_at: string | null;              // NEW — ISO timestamp, null = never paid
  stripe_payment_id: string | null;         // NEW
  stripe_checkout_session_id: string | null; // NEW
  theme: 'romantic' | 'modern';             // NEW — defaults to 'romantic'
  created_at: string;
  updated_at: string;
  chapters?: Chapter[];
}
```

Also add a `StoryTheme` type near the top of the file:

```typescript
export type StoryTheme = 'romantic' | 'modern';

export const STORY_THEMES: { value: StoryTheme; label: string }[] = [
  { value: 'romantic', label: 'Romantic' },
  { value: 'modern', label: 'Modern' },
];
```

**Step 2: Update CreateStoryInput**

Add `theme` to `CreateStoryInput`:

```typescript
export interface CreateStoryInput {
  title: string;
  occasion?: string;
  anniversary_number?: number;
  recipient_name?: string;
  theme?: StoryTheme; // NEW — defaults to 'romantic' in DB
}
```

**Step 3: Update validation schema**

In `lib/utils/validation.ts`, add theme to `CreateStorySchema`:

```typescript
export const CreateStorySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be under 100 characters"),
  occasion: z.string().optional(),
  anniversary_number: z.number().int().min(1).max(200).optional(),
  recipient_name: z
    .string()
    .trim()
    .max(50, "Name must be under 50 characters")
    .optional(),
  theme: z.enum(['romantic', 'modern']).optional(), // NEW
});
```

Also add theme to `UpdateStorySchema` (check its current shape and add the same `theme` field).

**Step 4: Remove HARDCODED_USER_ID**

In `lib/utils/constants.ts`, remove lines 1-2:

```typescript
// DELETE these two lines:
// Phase 1: Single hardcoded user. Replace with auth in Phase 2.
export const HARDCODED_USER_ID = "00000000-0000-0000-0000-000000000001";
```

This will cause TypeScript errors in files that import it — that's expected. We'll fix those in Tasks 9-11.

**Step 5: Verify types compile**

Run: `npx tsc --noEmit 2>&1 | head -30`

Expected: Errors only in files that import `HARDCODED_USER_ID` (dashboard/page.tsx, storage.ts). No errors in the type files themselves.

**Step 6: Commit**

```bash
git add lib/types/story.ts lib/utils/validation.ts lib/utils/constants.ts
git commit -m "feat: add Phase 2 types (theme, payment fields), remove HARDCODED_USER_ID"
```

---

## Task 4: Switch Data Layer from Service Client to User-Scoped Client

**Files:**
- Modify: `lib/data/queries.ts` (all functions — switch from `createServiceClient` to `createClient` from server.ts)
- Modify: `lib/data/storage.ts` (all functions — same switch)

**Context:** Currently both files use `createServiceClient()` which bypasses RLS. For multi-user isolation, we need to use the user-scoped server client so RLS policies apply. Each function needs to accept or derive the Supabase client.

**Important architectural decision:** Rather than creating a new client inside every function (expensive), we'll pass a client parameter. Server Actions and Server Components will create the client once and pass it down.

**Step 1: Update queries.ts**

Change the import at the top:

```typescript
// BEFORE:
import { createServiceClient } from "@/lib/supabase/service";

// AFTER:
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
```

Then update each function to either:
- Accept an optional `supabase?: SupabaseClient` parameter
- Or create its own client if none provided

**Recommended pattern** — create client internally (keeps call sites simple, server client creation is cheap):

```typescript
export async function getStories(userId: string): Promise<StoryWithCount[]> {
  const supabase = await createClient();
  // ... rest stays the same, RLS now filters automatically
}
```

Do this for ALL functions in queries.ts. The key change is replacing `createServiceClient()` with `await createClient()` everywhere.

**Step 2: Update storage.ts**

Same pattern — replace `createServiceClient()` with `await createClient()` in every function.

**Important:** Remove the `HARDCODED_USER_ID` import and usage in `createStory()`. The `user_id` will now come from the session (set in the Server Action, passed as input, or we let the DB default handle it if we add a trigger).

The cleanest approach: have the Server Action get the user ID from the session and pass it to `createStory()`:

```typescript
// In storage.ts - createStory now requires user_id in input
export async function createStory(input: CreateStoryInput & { user_id: string }): Promise<Story> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stories")
    .insert({
      user_id: input.user_id, // Was HARDCODED_USER_ID
      title: input.title,
      occasion: input.occasion || null,
      anniversary_number: input.anniversary_number || null,
      recipient_name: input.recipient_name || null,
      theme: input.theme || 'romantic',
    })
    .select()
    .single();
  // ...
}
```

**Step 3: Keep service client for specific cases**

Keep `lib/supabase/service.ts` — it's still needed for:
- The Stripe webhook handler (runs outside user context)
- Recipient-facing queries (public reads, no user session)

For `getStoryBySlug()` and `getStoryCompletionBySlug()` (used by the public `/s/[slug]` page), these should keep using the service client because there's no user session on public pages. **Or** we use the anon key client — RLS public-read policies will allow it.

Actually, the server client with anon key + RLS public-read policies is the cleanest approach. The `/s/[slug]` server component won't have a user session, but the RLS policy `published = true` will allow the SELECT. So `createClient()` from server.ts works everywhere.

**Step 4: Verify no service client imports remain in queries.ts/storage.ts**

Run: `grep -n "createServiceClient" lib/data/queries.ts lib/data/storage.ts`

Expected: No matches.

**Step 5: Commit**

```bash
git add lib/data/queries.ts lib/data/storage.ts
git commit -m "feat: switch data layer to user-scoped Supabase client for RLS"
```

---

## Task 5: Middleware — Anonymous Session Creation

**Files:**
- Modify: `middleware.ts`

**Context:** The middleware needs to:
1. Refresh existing sessions (standard Supabase middleware pattern)
2. Create anonymous sessions for visitors with no session
3. Stop redirecting `/` to `/dashboard` (we'll handle this differently)

**Step 1: Install required dependency (if not present)**

`@supabase/ssr` is already installed. No action needed.

**Step 2: Rewrite middleware.ts**

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session (important for token rotation)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If no session exists and user is visiting a dashboard route or root,
  // create an anonymous session so they can start creating immediately
  if (!user && (request.nextUrl.pathname === "/" || request.nextUrl.pathname.startsWith("/dashboard"))) {
    await supabase.auth.signInAnonymously();
  }

  // Redirect root to dashboard
  if (request.nextUrl.pathname === "/") {
    const redirectUrl = new URL("/dashboard", request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Copy cookies from supabaseResponse to redirect response
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  // Redirect authenticated users away from auth pages
  if (user && !user.is_anonymous && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
    const redirectUrl = new URL("/dashboard", request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/login",
    "/signup",
  ],
};
```

**Key decisions:**
- Anonymous session created automatically on first visit to `/` or `/dashboard`
- Root still redirects to `/dashboard` (preserving Phase 1 behavior)
- Auth pages redirect to dashboard if user is already authenticated (non-anonymous)
- Session refresh on every request (standard Supabase pattern)

**Step 3: Test locally**

Run: `npm run dev`

1. Open incognito browser → go to `localhost:3000`
2. Should redirect to `/dashboard`
3. Check browser DevTools > Application > Cookies — should see Supabase auth cookies
4. Check Supabase Dashboard > Authentication > Users — should see an anonymous user

**Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat: middleware creates anonymous sessions, refreshes auth tokens"
```

---

## Task 6: Auth Pages — Login, Signup, Callback

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/signup/page.tsx`
- Create: `app/auth/callback/route.ts`

**Context:** We need login/signup pages for when anonymous users are prompted to create a real account. The callback route handles magic link email verification redirects.

**Step 1: Create login page**

Create `app/login/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"password" | "magic-link">("password");
  const router = useRouter();

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Check your email for the login link!");
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Log in to your OurStory account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            {mode === "password" && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : mode === "password" ? "Log In" : "Send Magic Link"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            <button
              type="button"
              onClick={() => setMode(mode === "password" ? "magic-link" : "password")}
              className="underline hover:text-foreground"
            >
              {mode === "password" ? "Use magic link instead" : "Use password instead"}
            </button>
          </div>

          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline font-medium hover:text-foreground">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Create signup page**

Create `app/signup/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    // If user has an anonymous session, link the identity instead of creating new
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (currentUser?.is_anonymous) {
      // Link email identity to anonymous account — preserves user_id and all data
      const { error } = await supabase.auth.updateUser({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }

      toast.success("Account created! Check your email to verify.");
      router.push("/dashboard");
      router.refresh();
      return;
    }

    // No anonymous session — standard signup
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Account created! Check your email to verify.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Start building interactive stories</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline font-medium hover:text-foreground">
              Log in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Critical detail:** The signup page checks for an anonymous session and uses `updateUser()` to link the identity rather than `signUp()`. This preserves the anonymous user's ID and all their data (stories, chapters).

**Step 3: Create auth callback route**

Create `app/auth/callback/route.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If code exchange fails, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
```

**Step 4: Verify pages render**

Run: `npm run dev`

Visit `localhost:3000/login` and `localhost:3000/signup` — both should render forms.

**Step 5: Commit**

```bash
git add app/login/page.tsx app/signup/page.tsx app/auth/callback/route.ts
git commit -m "feat: add login, signup, and auth callback pages"
```

---

## Task 7: Auth Modal for Anonymous Users

**Files:**
- Create: `components/shared/AuthModal.tsx`

**Context:** When an anonymous user tries to publish, we show a modal prompting them to sign up. This reuses the same auth logic as the signup page but in a dialog.

**Step 1: Create AuthModal component**

Create `components/shared/AuthModal.tsx`:

```typescript
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  title?: string;
  description?: string;
}

export function AuthModal({
  open,
  onOpenChange,
  onSuccess,
  title = "Sign up to publish",
  description = "Create an account to save your story and get a shareable link.",
}: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    // Link email identity to anonymous account
    const { error } = await supabase.auth.updateUser({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Account created! Check your email to verify.");
    setLoading(false);
    onOpenChange(false);
    router.refresh();
    onSuccess?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="modal-email">Email</Label>
            <Input
              id="modal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="modal-password">Password</Label>
            <Input
              id="modal-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up & Continue"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add components/shared/AuthModal.tsx
git commit -m "feat: add AuthModal for anonymous user signup during publish"
```

---

## Task 8: NavBar with Auth State

**Files:**
- Create: `components/shared/NavBar.tsx`
- Modify: `app/layout.tsx` (add NavBar)
- Modify: `app/dashboard/layout.tsx` (if exists, integrate NavBar)

**Context:** We need a top navigation bar that shows the user's auth state — anonymous users see Login/Signup buttons, authenticated users see their email and a Logout button.

**Step 1: Create NavBar component**

Create `components/shared/NavBar.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";

export function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) return null;

  const isAnonymous = user?.is_anonymous ?? true;

  return (
    <nav className="flex items-center justify-between border-b px-6 py-3">
      <Link href="/dashboard" className="text-lg font-semibold">
        OurStory
      </Link>
      <div className="flex items-center gap-3">
        {isAnonymous ? (
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Log In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
```

**Step 2: Add NavBar to dashboard layout**

Check if there's a dashboard layout (`app/dashboard/layout.tsx`). If so, add `<NavBar />` at the top. If the NavBar should appear on all pages, add it to `app/layout.tsx` instead — but only render it on non-recipient routes (not `/s/*`).

The cleanest approach: add NavBar to the dashboard layout only (not the root layout), since `/s/*` routes have their own layout and auth pages don't need it.

**Step 3: Test**

1. Visit dashboard in incognito — should see "Log In" / "Sign Up" buttons
2. Sign up → should see email + logout button
3. Log out → should redirect to login

**Step 4: Commit**

```bash
git add components/shared/NavBar.tsx app/dashboard/layout.tsx
git commit -m "feat: add NavBar with auth state (login/signup for anonymous, email/logout for authenticated)"
```

---

## Task 9: Update Dashboard to Use Session User

**Files:**
- Modify: `app/dashboard/page.tsx` (line 7, 14 — replace HARDCODED_USER_ID with session)

**Context:** The dashboard page currently imports `HARDCODED_USER_ID` and passes it to `getStories()`. We need to get the user ID from the Supabase session instead.

**Step 1: Update dashboard page**

Replace the HARDCODED_USER_ID usage:

```typescript
// BEFORE (lines 7, 14):
import { HARDCODED_USER_ID } from "@/lib/utils/constants";
const stories = await getStories(HARDCODED_USER_ID);

// AFTER:
import { createClient } from "@/lib/supabase/server";

// Inside the component:
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  redirect("/login");
}

const stories = await getStories(user.id);
```

**Step 2: Verify**

Run: `npm run dev` → visit dashboard → should load stories for the current user (empty for new anonymous users).

**Step 3: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: dashboard fetches stories for session user instead of hardcoded ID"
```

---

## Task 10: Update Storage Layer — Remove HARDCODED_USER_ID

**Files:**
- Modify: `lib/data/storage.ts` (line 5 import, line 26 usage)

**Context:** `createStory()` in storage.ts currently uses `HARDCODED_USER_ID`. We need it to accept `user_id` as a parameter instead.

**Step 1: Update createStory**

```typescript
// BEFORE (line 26):
user_id: HARDCODED_USER_ID,

// AFTER — user_id comes from input parameter:
user_id: input.user_id,
```

Update the function signature to require `user_id`:

```typescript
export async function createStory(
  input: CreateStoryInput & { user_id: string }
): Promise<Story> {
```

Remove the `HARDCODED_USER_ID` import from the top of the file.

**Step 2: Update createStoryAction**

In `actions/story-actions.ts`, update the `createStoryAction` to get user ID from session and pass it:

```typescript
export async function createStoryAction(
  input: z.infer<typeof CreateStorySchema>
): Promise<ActionResult<Story>> {
  // ... existing validation ...

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const story = await dbCreate({ ...parsed, user_id: user.id });
  // ...
}
```

**Step 3: Verify no HARDCODED_USER_ID imports remain**

Run: `grep -rn "HARDCODED_USER_ID" --include="*.ts" --include="*.tsx" lib/ app/ actions/ components/`

Expected: No matches (only in docs/Audit.md/CLAUDE.md).

**Step 4: Verify build**

Run: `npm run build`

Expected: Clean build with no errors.

**Step 5: Commit**

```bash
git add lib/data/storage.ts actions/story-actions.ts
git commit -m "feat: createStory accepts user_id from session, remove all HARDCODED_USER_ID usage"
```

---

## Task 11: Update Server Actions — Add Auth Checks

**Files:**
- Modify: `actions/story-actions.ts` (all actions)
- Modify: `actions/chapter-actions.ts` (all actions)
- Modify: `actions/media-actions.ts` (all actions)

**Context:** All server actions that modify data need to verify the user is authenticated. With RLS enabled, unauthorized operations will fail at the DB level, but we should also check at the action level for clear error messages.

**Step 1: Create auth helper**

Add a helper function at the top of each action file (or in a shared helper):

```typescript
import { createClient } from "@/lib/supabase/server";

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
```

**Step 2: Add auth check to each action**

At the start of each action that modifies data, add:

```typescript
const user = await getAuthUser();
if (!user) {
  return { success: false, error: "Not authenticated" };
}
```

**Which actions need this:**
- `createStoryAction` — needs user for `user_id`
- `updateStoryAction` — RLS handles ownership, but check auth
- `updateFinalMessageAction` — same
- `deleteStoryAction` — same
- `publishStoryAction` — needs additional anonymous check (Task 14)
- `unpublishStoryAction` — same
- `saveStoryCompletionAction` — does NOT need auth (recipients are unauthenticated)

**Step 3: Verify**

Run: `npm run build`

**Step 4: Commit**

```bash
git add actions/story-actions.ts actions/chapter-actions.ts actions/media-actions.ts
git commit -m "feat: add auth checks to all server actions"
```

---

## Task 12: Stripe Integration — Client + Checkout Action

**Files:**
- Create: `lib/stripe.ts`
- Modify: `actions/story-actions.ts` (add `createCheckoutSessionAction`)
- Modify: `package.json` (add `stripe` dependency)

**Context:** We need Stripe for the $6 pay-per-publish model. The flow: Server Action creates a Checkout Session → redirect user to Stripe → webhook confirms payment.

**Step 1: Install Stripe**

```bash
npm install stripe
```

**Step 2: Create Stripe client**

Create `lib/stripe.ts`:

```typescript
import Stripe from "stripe";

export const isStripeEnabled = process.env.STRIPE_ENABLED === "true";

// Lazy-init: only create Stripe client when actually needed
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    }
    _stripe = new Stripe(key, {
      apiVersion: "2025-01-27.acacia", // Use latest stable API version
      typescript: true,
    });
  }
  return _stripe;
}
```

**Key detail:** `isStripeEnabled` is the beta gate. When `STRIPE_ENABLED=false` (or unset), the Stripe client is never initialized — so `STRIPE_SECRET_KEY` doesn't need to exist in beta deploys. The `getStripe()` function lazy-initializes only when called.

**Note:** Check the latest Stripe API version at the time of implementation and use that.

**Step 3: Add checkout session action**

In `actions/story-actions.ts`, add:

```typescript
import { getStripe, isStripeEnabled } from "@/lib/stripe";

export async function createCheckoutSessionAction(
  storyId: string
): Promise<ActionResult<{ checkoutUrl: string }>> {
  try {
    if (!isStripeEnabled) {
      return { success: false, error: "STRIPE_DISABLED" };
    }

    const user = await getAuthUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    if (user.is_anonymous) {
      return { success: false, error: "ANONYMOUS_USER" };
    }

    const story = await getStory(storyId);
    if (!story) {
      return { success: false, error: "Story not found" };
    }

    const stripe = getStripe();

    // Already published — no payment needed
    if (story.published_at) {
      return { success: false, error: "Story already published" };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Publish: ${story.title}`,
              description: "One-time payment to publish your OurStory",
            },
            unit_amount: 600, // $6.00 in cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        story_id: storyId,
        user_id: user.id,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/story/${storyId}?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/story/${storyId}?payment=cancelled`,
    });

    if (!session.url) {
      return { success: false, error: "Failed to create checkout session" };
    }

    return { success: true, data: { checkoutUrl: session.url } };
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return { success: false, error: "Payment system error" };
  }
}
```

**Step 4: Add NEXT_PUBLIC_APP_URL to env**

Add to `.env.local`:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

(In production on Vercel, set this to the actual domain.)

**Step 5: Commit**

```bash
git add lib/stripe.ts actions/story-actions.ts package.json package-lock.json
git commit -m "feat: add Stripe client and checkout session creation action"
```

---

## Task 13: Stripe Webhook Handler

**Files:**
- Create: `app/api/webhooks/stripe/route.ts`

**Context:** After payment, Stripe sends a `checkout.session.completed` event to our webhook. This handler marks the story as published.

**Step 1: Create webhook route**

Create `app/api/webhooks/stripe/route.ts`:

```typescript
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { generateSlug } from "@/lib/utils/slug";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const storyId = session.metadata?.story_id;
    const paymentIntentId = typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

    if (!storyId) {
      console.error("No story_id in checkout session metadata");
      return NextResponse.json({ error: "Missing story_id" }, { status: 400 });
    }

    // Use service client (webhook runs outside user context)
    const supabase = createServiceClient();

    // Check if already processed (idempotency)
    const { data: existing } = await supabase
      .from("stories")
      .select("id, published_at, stripe_checkout_session_id, title")
      .eq("id", storyId)
      .single();

    if (existing?.stripe_checkout_session_id === session.id) {
      // Already processed this webhook
      return NextResponse.json({ received: true });
    }

    // Generate slug
    const slug = await generateSlugWithRetry(supabase, existing?.title || "story");

    // Mark as published
    const { error } = await supabase
      .from("stories")
      .update({
        published: true,
        published_at: new Date().toISOString(),
        stripe_payment_id: paymentIntentId || null,
        stripe_checkout_session_id: session.id,
        slug,
      })
      .eq("id", storyId);

    if (error) {
      console.error("Failed to update story after payment:", error);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

async function generateSlugWithRetry(
  supabase: ReturnType<typeof createServiceClient>,
  title: string,
  maxRetries = 5
): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const slug = generateSlug(title);
    const { data } = await supabase
      .from("stories")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!data) return slug;
  }
  // Fallback: use a longer nanoid
  return generateSlug(title);
}
```

**Key details:**
- Uses **service client** (webhook has no user session)
- Idempotent — checks if `stripe_checkout_session_id` already matches
- Generates slug on publish (same logic as Phase 1 `publishStory`)
- Returns 200 even for unhandled event types (Stripe best practice)

**Step 2: USER ACTION — Configure Stripe webhook**

> In Stripe Dashboard:
> 1. Go to Developers > Webhooks
> 2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
> 3. Select event: `checkout.session.completed`
> 4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET` env var
>
> For local development, use Stripe CLI:
> ```bash
> stripe listen --forward-to localhost:3000/api/webhooks/stripe
> ```

**Step 3: Commit**

```bash
git add app/api/webhooks/stripe/route.ts
git commit -m "feat: add Stripe webhook handler for checkout.session.completed"
```

---

## Task 14: Update Publish Flow — Payment Gate

**Files:**
- Modify: `components/dashboard/PublishDialog.tsx`
- Modify: `components/dashboard/StoryEditorHeader.tsx`

**Context:** The publish dialog needs three modes:
1. **Beta mode** (`STRIPE_ENABLED=false`): publish directly for free, no payment UI shown
2. **First publish with payments** (`STRIPE_ENABLED=true`, no `published_at`): show price, redirect to Stripe
3. **Re-publish** (has `published_at`): free update, existing behavior

Also need to handle anonymous users — show AuthModal before allowing publish.

**Step 1: Pass beta flag to client**

The `isStripeEnabled` flag lives server-side. To use it in the client component, pass it as a prop from the server component (story editor page), or use `NEXT_PUBLIC_STRIPE_ENABLED` env var.

Simpler approach — use a public env var:

```typescript
// In PublishDialog or wherever needed:
const isPaymentEnabled = process.env.NEXT_PUBLIC_STRIPE_ENABLED === "true";
```

**Step 2: Update PublishDialog**

The dialog needs to:
- Check `isPaymentEnabled` (beta gate)
- If payments disabled (beta): publish directly for free — same as Phase 1 behavior
- If payments enabled AND first publish: show "$6 one-time" messaging, redirect to Stripe
- If re-publish: show "Update Story" button, free update

Key changes to `handlePublish()`:

```typescript
const isPaymentEnabled = process.env.NEXT_PUBLIC_STRIPE_ENABLED === "true";

async function handlePublish() {
  setLoading(true);

  // Beta mode OR re-publish: publish directly (free)
  if (!isPaymentEnabled || story.published_at) {
    const result = await publishStoryAction(story.id, story.title);
    // ... existing success/error handling
    return;
  }

  // Payments enabled + first publish → redirect to Stripe
  const result = await createCheckoutSessionAction(story.id);
  if (!result.success) {
    if (result.error === "ANONYMOUS_USER") {
      setShowAuthModal(true);
      setLoading(false);
      return;
    }
    toast.error(result.error);
    setLoading(false);
    return;
  }
  window.location.href = result.data.checkoutUrl;
}
```

Update the dialog UI to conditionally show pricing info:

```typescript
{isPaymentEnabled && !story.published_at ? (
  <>
    <p className="text-sm text-muted-foreground">
      Publishing creates a permanent shareable link. You can edit anytime after for free.
    </p>
    <p className="font-medium">One-time payment: $6</p>
  </>
) : story.published_at ? (
  <p className="text-sm text-muted-foreground">
    Your changes will be live immediately at your shareable link.
  </p>
) : (
  <p className="text-sm text-muted-foreground">
    Publishing creates a permanent shareable link. You can edit anytime after for free.
  </p>
)}
```

Button text changes:
- Beta first publish: "Publish" (no mention of payment)
- Paid first publish: "Pay & Publish"
- Re-publish: "Update Story"

**Step 2: Update StoryEditorHeader**

Handle the `?payment=success` query parameter:

```typescript
import { useSearchParams } from "next/navigation";

// Inside component:
const searchParams = useSearchParams();

useEffect(() => {
  if (searchParams.get("payment") === "success") {
    toast.success("Payment successful! Your story is now published.");
    // Clean up URL
    window.history.replaceState({}, "", window.location.pathname);
  }
}, [searchParams]);
```

Also add the AuthModal integration — if publish is clicked and user is anonymous:

```typescript
const [showAuthModal, setShowAuthModal] = useState(false);

// Before opening publish dialog, check if user is anonymous
async function handlePublishClick() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.is_anonymous) {
    setShowAuthModal(true);
    return;
  }

  setShowPublishDialog(true);
}
```

**Step 3: Test the full flow**

1. Create a story as anonymous user
2. Click Publish → should show AuthModal
3. Sign up → should return to story
4. Click Publish again → should show PublishDialog with "$6" pricing
5. Click "Pay & Publish" → should redirect to Stripe
6. Complete payment → should redirect back with `?payment=success`
7. Story should be published with a shareable link

**Step 4: Commit**

```bash
git add components/dashboard/PublishDialog.tsx components/dashboard/StoryEditorHeader.tsx
git commit -m "feat: publish flow with Stripe payment gate and anonymous user handling"
```

---

## Task 15: Theme System — CSS + Dynamic Application

**Files:**
- Modify: `app/globals.css` (rename `.theme-recipient`, add `.theme-modern`)
- Modify: `app/s/layout.tsx` (remove hardcoded theme class)
- Modify: `app/s/[slug]/page.tsx` (apply dynamic theme class)
- Modify: `app/dashboard/preview/[storyId]/page.tsx` (apply dynamic theme)

**Context:** Currently `.theme-recipient` is the only theme, hardcoded in the layout. We need to rename it to `.theme-romantic`, add `.theme-modern`, and apply themes dynamically based on the story's `theme` field.

**Step 1: Rename .theme-recipient to .theme-romantic in globals.css**

Find-and-replace `.theme-recipient` → `.theme-romantic` in `app/globals.css`.

**Step 2: Add .theme-modern CSS class**

Add after `.theme-romantic` in `globals.css`:

```css
/* ─── Modern Theme ───────────────────────────────────────────────────── */
.theme-modern {
  --background: oklch(0.98 0.003 250);       /* Cool near-white */
  --foreground: oklch(0.15 0.01 250);        /* Near-black with blue tint */
  --card: oklch(0.97 0.005 250);
  --card-foreground: oklch(0.15 0.01 250);
  --popover: oklch(0.98 0.003 250);
  --popover-foreground: oklch(0.15 0.01 250);
  --primary: oklch(0.60 0.15 185);           /* Teal */
  --primary-foreground: oklch(0.98 0.003 250);
  --secondary: oklch(0.95 0.005 250);        /* Light gray */
  --secondary-foreground: oklch(0.15 0.01 250);
  --muted: oklch(0.93 0.005 250);
  --muted-foreground: oklch(0.45 0.01 250);  /* Medium gray */
  --accent: oklch(0.65 0.18 25);             /* Coral accent */
  --accent-foreground: oklch(0.15 0.01 250);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.90 0.005 250);
  --input: oklch(0.90 0.005 250);
  --ring: oklch(0.60 0.15 185);              /* Teal ring */
  --radius: 0.5rem;
  --viewer-voice: oklch(0.50 0.01 250);

  font-family: var(--font-sans);
}
```

**Step 3: Update recipient layout**

In `app/s/layout.tsx`, remove the hardcoded `.theme-recipient` class:

```typescript
// BEFORE:
<div className="theme-recipient">{children}</div>

// AFTER:
<MotionConfig reducedMotion="user">
  {children}
</MotionConfig>
```

The theme class will be applied by the page component instead.

**Step 4: Apply dynamic theme in recipient page**

In `app/s/[slug]/page.tsx`, wrap the content with the theme class:

```typescript
// After fetching story:
const themeClass = `theme-${story.theme || 'romantic'}`;

return (
  <div className={themeClass}>
    <StoryExperience story={story} completion={completion} />
  </div>
);
```

**Step 5: Apply dynamic theme in preview page**

Same pattern in `app/dashboard/preview/[storyId]/page.tsx`:

```typescript
const themeClass = `theme-${story.theme || 'romantic'}`;

return (
  <div className={themeClass}>
    {/* preview content */}
  </div>
);
```

**Step 6: Search for any remaining .theme-recipient references**

Run: `grep -rn "theme-recipient" --include="*.tsx" --include="*.ts" --include="*.css"`

Fix any remaining references.

**Step 7: Test both themes**

1. Create a story with "romantic" theme → preview → should look like current Phase 1
2. Create a story with "modern" theme → preview → should show teal/gray/coral palette with sans-serif font

**Step 8: Commit**

```bash
git add app/globals.css app/s/layout.tsx app/s/[slug]/page.tsx app/dashboard/preview/[storyId]/page.tsx
git commit -m "feat: theme system with Romantic + Modern, dynamically applied per story"
```

---

## Task 16: Theme Selector in Story Creation

**Files:**
- Modify: `components/dashboard/CreateStoryForm.tsx` (add theme picker)
- Modify: `components/dashboard/StoryCard.tsx` (show theme indicator)

**Context:** The create story form needs a theme selector. Story cards should show a visual indicator of which theme is applied.

**Step 1: Add theme selector to CreateStoryForm**

After the occasion field in the form, add a theme picker:

```typescript
import { STORY_THEMES } from "@/lib/types/story";

// In form default values:
theme: "romantic" as const,

// In JSX, after occasion/anniversary fields:
<div className="space-y-2">
  <Label>Style</Label>
  <p className="text-sm text-muted-foreground">Choose how your story looks to the recipient</p>
  <div className="grid grid-cols-2 gap-3">
    {STORY_THEMES.map((theme) => (
      <button
        key={theme.value}
        type="button"
        onClick={() => form.setValue("theme", theme.value)}
        className={cn(
          "rounded-lg border-2 p-4 text-left transition-colors",
          form.watch("theme") === theme.value
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-4 w-4 rounded-full"
            style={{
              background: theme.value === "romantic"
                ? "oklch(0.68 0.19 10)"   // Rose
                : "oklch(0.60 0.15 185)", // Teal
            }}
          />
          <span className="font-medium">{theme.label}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {theme.value === "romantic"
            ? "Warm & intimate — rose, cream, serif font"
            : "Clean & contemporary — teal, gray, sans-serif"}
        </p>
      </button>
    ))}
  </div>
</div>
```

**Step 2: Add theme indicator to StoryCard**

In `StoryCard.tsx`, add a small colored dot next to the status badges:

```typescript
// In the badges section, add:
<Badge variant="outline" className="gap-1">
  <div
    className="h-2.5 w-2.5 rounded-full"
    style={{
      background: story.theme === "modern"
        ? "oklch(0.60 0.15 185)"
        : "oklch(0.68 0.19 10)",
    }}
  />
  {story.theme === "modern" ? "Modern" : "Romantic"}
</Badge>
```

**Step 3: Test**

1. Create new story → should see theme selector with Romantic selected by default
2. Select Modern → create → story card should show "Modern" badge with teal dot
3. Preview → should render with Modern theme

**Step 4: Commit**

```bash
git add components/dashboard/CreateStoryForm.tsx components/dashboard/StoryCard.tsx
git commit -m "feat: theme selector in story creation, theme badge on story cards"
```

---

## Task 17: Landing Page Redirect & Root Route

**Files:**
- Modify: `app/page.tsx`

**Context:** Currently `app/page.tsx` redirects to `/dashboard`. With the middleware handling anonymous sessions and the root redirect (Task 5), the `page.tsx` redirect is redundant. However, we should keep a simple page component in case middleware misses it.

**Step 1: Simplify app/page.tsx**

```typescript
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

This stays the same as Phase 1 — the middleware handles anonymous session creation before this redirect fires. No separate landing page needed (per design decision).

**Step 2: Verify flow**

1. Incognito → `localhost:3000` → should get anonymous session + redirect to dashboard
2. Should see empty dashboard with "Create Your First Story" + Login/Signup in navbar

**Step 3: No commit needed** (no changes from Phase 1)

---

## Task 18: Migrate Existing Data

**Files:** None (Supabase SQL Editor)

**Context:** Shakeb's existing stories use `HARDCODED_USER_ID` (`00000000-0000-0000-0000-000000000001`). After creating a real account, we need to migrate those stories.

**Step 1: USER ACTION — Create Shakeb's account**

> 1. Sign up at `/signup` with your real email
> 2. Note the user ID from Supabase Dashboard > Authentication > Users
> 3. Run this SQL in Supabase SQL Editor:

```sql
-- Replace <YOUR_REAL_USER_ID> with the UUID from Supabase Auth dashboard
UPDATE stories
SET user_id = '<YOUR_REAL_USER_ID>'
WHERE user_id = '00000000-0000-0000-0000-000000000001';
```

**Step 2: Verify**

Log in as Shakeb → dashboard should show all existing stories.

**Step 3: Add FK constraint (if not done in Task 1)**

Now that the user_id values are valid auth.users references:

```sql
-- Only if this wasn't already run in Task 1
ALTER TABLE stories
  ADD CONSTRAINT stories_user_id_auth_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id);
```

---

## Task 19: Environment Variables & Stripe Setup

**Files:**
- Modify: `.env.local`

**Context:** Phase 2 requires new environment variables for Stripe and the app URL.

**Step 1: Add to .env.local**

```
# Existing
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# New for Phase 2
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Stripe — Beta mode: set STRIPE_ENABLED=false (or omit) to disable payments
# Set to true + add keys when ready to test/enable payments
STRIPE_ENABLED=false
NEXT_PUBLIC_STRIPE_ENABLED=false
STRIPE_SECRET_KEY=                          # Not needed during beta
STRIPE_WEBHOOK_SECRET=                      # Not needed during beta
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=         # Not needed during beta
```

**Step 2: USER ACTION — Set up Stripe account (when ready to test)**

> 1. Create Stripe account at stripe.com (if not already)
> 2. Get test mode API keys from Developers > API keys
> 3. Set up webhook endpoint (see Task 13)
> 4. Set `STRIPE_ENABLED=true` and `NEXT_PUBLIC_STRIPE_ENABLED=true` in `.env.local`
> 5. Add Stripe keys to `.env.local`
> 6. Test the full payment flow locally

**Step 3: USER ACTION — Set Vercel env vars for production**

> In Vercel Dashboard:
> 1. Go to project Settings > Environment Variables
> 2. Add all new env vars for Production environment
> 3. Set `NEXT_PUBLIC_APP_URL` to your production domain
> 4. **For beta launch:** Set `STRIPE_ENABLED=false` and `NEXT_PUBLIC_STRIPE_ENABLED=false` — no Stripe keys needed
> 5. **When ready for payments:** Set both to `true` and add Stripe keys

---

## Task 20: End-to-End Testing & Verification

**Context:** Manual QA across all Phase 2 features.

**Authentication Tests:**
- [ ] Visit root as new user → anonymous session created → dashboard loads
- [ ] Create story as anonymous → story saved to DB
- [ ] Click Publish as anonymous → AuthModal appears
- [ ] Sign up in AuthModal → account created, stories preserved
- [ ] Log out → redirect to login
- [ ] Log in → dashboard shows stories
- [ ] Magic link login works (check email)

**Multi-User Isolation Tests:**
- [ ] User A creates stories → only visible to User A
- [ ] User B creates stories → only visible to User B
- [ ] User A cannot access User B's story editor URL (RLS blocks)
- [ ] Published stories visible to anyone at `/s/[slug]`

**Beta Mode Tests (STRIPE_ENABLED=false):**
- [ ] First publish → publishes directly, no payment UI shown
- [ ] Story gets published with shareable link for free
- [ ] Re-publish → updates instantly (free)
- [ ] No Stripe-related text or buttons visible anywhere

**Payment Tests (STRIPE_ENABLED=true, local testing only):**
- [ ] Set `STRIPE_ENABLED=true` + `NEXT_PUBLIC_STRIPE_ENABLED=true` in `.env.local`
- [ ] Add Stripe test keys to `.env.local`
- [ ] Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- [ ] First publish → shows "$6 one-time" text → Stripe checkout redirect
- [ ] Complete payment (test card `4242 4242 4242 4242`) → redirect back with success
- [ ] Story is published with shareable link
- [ ] Re-publish same story → free, no Stripe redirect
- [ ] Create second story → first publish requires another $6
- [ ] Cancel payment → story stays unpublished
- [ ] Set `STRIPE_ENABLED=false` → payment UI disappears, publish is free again

**Theme Tests:**
- [ ] Create story with Romantic theme → preview looks like Phase 1
- [ ] Create story with Modern theme → preview shows teal/gray/sans-serif
- [ ] Published story respects theme at `/s/[slug]`
- [ ] Dashboard always shows default theme (not recipient theme)
- [ ] Story card shows theme badge

**Regression Tests:**
- [ ] All 5 prompt types work in recipient experience
- [ ] Audio playback works
- [ ] Image upload works
- [ ] Story completion + save works
- [ ] Export works
- [ ] Mobile responsive (recipient)

---

## Dependency Graph

```
Task 1 (DB migration) ─┐
Task 2 (Anon auth)  ───┤
                        ├─→ Task 3 (Types) ─→ Task 4 (Data layer) ─┐
                        │                                            │
                        │        Task 5 (Middleware) ────────────────┤
                        │        Task 6 (Auth pages) ───────────────┤
                        │        Task 7 (Auth modal) ───────────────┤
                        │                                            │
                        │                   ┌───────────────────────┘
                        │                   ▼
                        │   Task 8 (NavBar) ─→ Task 9 (Dashboard) ─→ Task 10 (Storage)
                        │                                              │
                        │                                              ▼
                        │                                    Task 11 (Auth in actions)
                        │                                              │
                        │                    ┌─────────────────────────┘
                        │                    ▼
                        ├──→ Task 12 (Stripe client) ─→ Task 13 (Webhook)
                        │                                    │
                        │                                    ▼
                        │                          Task 14 (Publish flow)
                        │
                        └──→ Task 15 (Theme CSS) ─→ Task 16 (Theme selector)
                                                          │
                                                          ▼
                                                   Task 17 (Root route)
                                                          │
                                                          ▼
                                                   Task 18 (Data migration)
                                                          │
                                                          ▼
                                                   Task 19 (Env vars)
                                                          │
                                                          ▼
                                                   Task 20 (E2E testing)
```

**Parallelizable groups:**
- Tasks 1-2: Supabase config (manual, do first)
- Tasks 5, 6, 7: Auth infrastructure (can be built in parallel after Task 3-4)
- Tasks 12-13: Stripe (independent of auth UI)
- Task 15: Theme CSS (independent of everything else)
