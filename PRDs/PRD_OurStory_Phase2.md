# OurStory Phase 2 PRD - Multi-User SaaS Launch

**Version:** 1.0  
**Date:** February 2026  
**Target:** 3-4 weeks after Phase 1 completion

---

## Executive Summary

Phase 2 transforms OurStory from a single-user prototype into a multi-user SaaS with monetization and flexible styling.

**What Phase 1 Built:**
- Complete story builder (chapters, prompts, media, final message)
- Full recipient experience (interactive story with all prompt types)
- Publish flow with shareable links
- Supabase backend (no auth, single user)

**What Phase 2 Adds:**
- Authentication & multi-user support
- Monetization (freemium + one-time payments)
- Theme system (4 visual styles)
- Improved UX polish

**What Phase 2 Does NOT Include:**
- Living Story feature (deferred to Phase 3)
- Subscriptions (only one-time payments)
- Physical book printing
- Parent-child educational features
- Templates or pre-made content

---

## Goals & Success Metrics

### Primary Goals
1. Enable 10+ users to independently create and pay for stories
2. Validate willingness to pay ($12 per story)
3. Support multiple use cases (romantic, kids, friends, milestones)

### Success Metrics
- 10+ user signups
- 2+ paid conversions
- Zero data leakage between users
- All Phase 1 features still work
- 4 themes designed and working

---

## Core Features

### 1. Authentication

**Provider:** Supabase Auth

**Methods:**
- Email + Password (primary)
- Magic Link (passwordless email)
- Google OAuth (optional, nice-to-have)

**Pages:**
- `/login` - Email/password or magic link
- `/signup` - Create account
- `/auth/callback` - OAuth redirect handler

**Protected Routes:**
- `/dashboard/*` - Requires authentication
- All other routes public

**User Flow:**
```
New User:
Landing page → Sign up → Email verification → Dashboard

Returning User:
Landing page → Log in → Dashboard
```

---

### 2. Multi-User Data Isolation

**Database Changes:**

```sql
-- Add auth_user_id to stories
ALTER TABLE stories 
  ADD COLUMN auth_user_id UUID REFERENCES auth.users(id);

-- Enable Row Level Security
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- RLS Policies (see implementation doc for full SQL)
-- Users can only see/edit their own stories
-- Public can view published stories (recipient experience)
```

**Key Principle:**
- Each user owns their stories (`auth_user_id` foreign key)
- RLS policies enforce data isolation
- Public links (`/s/[slug]`) remain accessible to anyone

---

### 3. Monetization

**Model:** Pay-Per-Publish

**Free:**
- Create unlimited stories
- Unlimited chapters per story
- All features (prompts, media, themes, final message)
- Build, edit, preview forever
- No limits, no watermark while editing

**Paid:** $6 per publish (one-time per story)
- Click "Publish & Share" → Payment required
- Get permanent shareable link
- Story lives at that link forever
- Unlimited free edits after publishing (doesn't cost more)
- Create another story → Another $6 to publish

**Payment Flow:**

```
User clicks "Publish" on any story:
  ↓
Check: story.published_at exists?
  ↓
If no (never published):
  → Redirect to /checkout/[storyId]
  → Stripe Checkout session
  → User pays $6
  → Webhook updates story.published_at + stripe_payment_id
  → Redirect back to story editor
  → Story is now published with shareable link
  ↓
If yes (already published):
  → Updates story instantly (free edits)
  → No additional payment needed
```

**Database Changes:**

```sql
ALTER TABLE stories
  ADD COLUMN published_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN stripe_payment_id TEXT,
  ADD COLUMN stripe_checkout_session_id TEXT;

-- 'published' boolean column already exists from Phase 1
-- published_at tracks when payment happened
-- published remains true/false for recipient access logic
```

**Stripe Integration:**
- Checkout Sessions (one-time payments)
- Webhook endpoint: `/api/webhooks/stripe`
- Test mode for development
- Live mode for production

---

### 4. Theme System

**What:** 4 pre-designed visual styles for recipient experience

**Themes:**

1. **Romantic** (default, current)
   - Colors: Rose, cream, warm gold
   - Font: Lora (serif)
   - Feel: Intimate, literary

2. **Playful** (for kids/fun)
   - Colors: Bright blue, yellow, green
   - Font: Fredoka (rounded sans-serif)
   - Feel: Storybook, joyful

3. **Elegant** (formal/milestones)
   - Colors: Navy, gold, white
   - Font: Playfair Display (serif)
   - Feel: Sophisticated, celebratory

4. **Modern** (casual/friends)
   - Colors: Teal, gray, coral
   - Font: Inter (sans-serif)
   - Feel: Clean, contemporary

**Implementation:**
- CSS variables per theme
- Theme class applied to recipient experience
- Dashboard stays consistent (not themed)

**Database:**
```sql
ALTER TABLE stories
  ADD COLUMN theme TEXT DEFAULT 'romantic'
    CHECK (theme IN ('romantic', 'playful', 'elegant', 'modern'));
```

**User Flow:**
```
Create Story → Enter title/occasion → Choose theme → Build chapters

Can change theme anytime from story settings
```

---

## Updated User Flows

### Flow 1: New User Creates First Story

```
1. Land on homepage → "Get Started"
2. Sign up (email + password)
3. Email verification
4. Redirect to dashboard (empty state)
5. "Create Your First Story" → Create form
6. Enter title, occasion, recipient name
7. Choose theme (preview all 4 options)
8. Build chapters (up to 3 free)
9. Configure final message
10. Click "Publish"
11. Story published → Get shareable link
12. Share link with recipient
```

### Flow 2: User Builds and Publishes Story

```
1. User creates new story
2. Enters title, occasion, recipient name
3. Chooses theme
4. Adds chapters (no limit)
   - Chapter 1, 2, 3... unlimited
   - All prompts available
   - All media upload works
5. Previews story as recipient would see it
6. Happy with it → Clicks "Publish"
7. Payment prompt appears:
   "Publishing makes your story shareable.
   One-time payment: $6"
8. [Pay & Publish] or [Cancel]
9. If Pay → Stripe Checkout
10. After payment → Story published
11. Gets shareable link
12. Can edit story anytime (free)
13. Link remains permanent
```

### Flow 3: User Edits Published Story

```
1. User has published story (already paid $6)
2. Opens story editor
3. Makes changes (typo fix, add chapter, change image)
4. Clicks "Publish" again
5. Updates instantly (no payment)
6. Shareable link remains the same
7. Changes visible to anyone who opens link
```

### Flow 4: Recipient Experience

```
Recipient opens /s/[slug] link
  ↓
Experiences story (all prompts work)
  ↓
Reaches final message
  ↓
Bottom of page:
"Created with OurStory ❤️
[Create Your Own Story]"
```

**Note:** No watermark distinction. All published stories look the same (clean, professional). The creator paid to publish, so it's a premium experience.

---

## Pricing Rationale

### Why $6 Per Publish?

**Psychology:**
- Low enough to feel accessible (cost of a coffee)
- High enough to be taken seriously (not disposable)
- Below $10 psychological barrier
- Impulse-buy territory when emotionally invested

**Value comparison:**
- Greeting card: $5-8 (static, disposable)
- Photo print: $3-5 (static)
- Digital photo frame: $50-150 (hardware cost)
- Flower delivery: $40-80 (temporary)
- OurStory: $6 (interactive, permanent, unlimited edits)

**Revenue math:**
```
10 publishes/month × $6 = $60 MRR
50 publishes/month × $6 = $300 MRR  
100 publishes/month × $6 = $600 MRR

After Stripe fees (2.9% + 30¢):
$6.00 - $0.47 = $5.53 net per transaction
```

### Why Pay-Per-Publish?

**Alternative models considered:**

❌ **Subscription ($10/month):** Users don't create stories monthly, occasions are irregular

❌ **Pay-per-chapter ($1-3 per 3 chapters):** Feels transactional, encourages artificial limits, mental accounting problem

❌ **Pay upfront per story ($12):** Barrier before seeing value, no "try before you buy"

✅ **Pay-per-publish ($6):** 
- Zero barrier to start (build entire story free)
- Pay at moment of maximum value (right before sharing)
- User has invested time (sunk cost makes $6 feel small)
- Natural recurring revenue (occasions repeat yearly)
- Fair perceived value (pay for what you use)

### Revenue Model Projection

**Average user behavior (year 1):**
- Creates 2-3 stories/year (anniversary, birthday, special occasion)
- Publishes 2-3 times
- Revenue per user: $12-18/year

**Heavy user (year 1):**
- Creates 5-10 stories/year
- Publishes 5-10 times  
- Revenue per user: $30-60/year

**Light user (year 1):**
- Creates 1 story/year
- Publishes once
- Revenue per user: $6/year

**Key insight:** Even light users generate revenue. No "free riders" problem.



## UI/UX Updates

### Landing Page

**New:**
- "Get Started" button (instead of direct to dashboard)
- "Log In" link in header
- Shows 3 use case examples (not just romantic)
- Origin story section

**Headline:** "Turn your story into an experience"

**Subhead:** "Create interactive stories for the people who matter most"

### Dashboard Updates

**Story Cards show:**
- Title, occasion, chapter count
- Theme badge (visual indicator)
- Status badge:
  - "Draft" (not published yet)
  - "Published" (paid and live)
- Last edited timestamp
- Action buttons: Edit, Preview, Copy Link (if published), Delete

**Empty State:**
```
"Create Your First Story"
"Tell your story. They'll never forget it."
[Create Story Button]
```

### Publish Dialog Updates

**If never published before:**
```
┌─────────────────────────────────────┐
│ Publish Your Story                  │
├─────────────────────────────────────┤
│ ✓ All chapters complete             │
│ ✓ All prompts configured            │
│ ✓ Final message set                 │
│                                     │
│ Publishing creates a permanent      │
│ shareable link for your story.      │
│                                     │
│ You can edit anytime after          │
│ publishing for free.                │
│                                     │
│ One-time payment: $6                │
│                                     │
│ [Pay & Publish]  [Cancel]           │
└─────────────────────────────────────┘
```

**If already published:**
```
┌─────────────────────────────────────┐
│ Update Your Story                   │
├─────────────────────────────────────┤
│ Your changes will be live           │
│ immediately at your shareable link. │
│                                     │
│ [Update Story]  [Cancel]            │
└─────────────────────────────────────┘
```

### Theme Selection

**During story creation:**
```
┌─────────────────────────────────────┐
│ Choose a Style                      │
├─────────────────────────────────────┤
│ ┌───────┐ ┌───────┐ ┌───────┐     │
│ │ 🌹    │ │ 🎨    │ │ ✨    │     │
│ │Romantic│Playful│Elegant│          │
│ └───────┘ └───────┘ └───────┘     │
│                                     │
│ [Live Preview Below]                │
│                                     │
│ You can change this anytime.        │
│                                     │
│ [Continue]                          │
└─────────────────────────────────────┘
```

---

## Technical Architecture

### Auth Integration

**Middleware:**
```typescript
// middleware.ts
// Protects /dashboard routes
// Redirects to /login if not authenticated
```

**Server Actions Update:**
```typescript
// All actions that modify data:
// 1. Get user from Supabase Auth
// 2. Verify user exists
// 3. Pass user.id to data layer
// 4. RLS handles the rest
```

**Example:**
```typescript
export async function publishStoryAction(storyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { success: false, error: 'Not authenticated' }
  
  const { data: story } = await supabase
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .single()
  
  // If never published, require payment
  if (!story.published_at) {
    return { 
      success: false, 
      error: 'PAYMENT_REQUIRED',
      checkoutUrl: `/checkout/${storyId}`
    }
  }
  
  // Already paid, allow updates
  await publishStory(storyId)
  return { success: true }
}
```

### Stripe Integration

**Routes:**
- `/checkout/[storyId]` - Creates Stripe Checkout session, redirects to Stripe
- `/api/webhooks/stripe` - Handles `checkout.session.completed` event

**Environment Variables:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Key Files:**
```
/app/checkout/[storyId]/page.tsx
/app/api/webhooks/stripe/route.ts
/lib/stripe.ts (Stripe client initialization)
```

### Theme Implementation

**CSS Architecture:**
```css
/* themes.css */
.theme-romantic { /* CSS variables */ }
.theme-playful { /* CSS variables */ }
.theme-elegant { /* CSS variables */ }
.theme-modern { /* CSS variables */ }

/* All components use variables */
.story-container {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
}
```

**Load theme on recipient experience:**
```typescript
// app/s/[slug]/page.tsx
<div className={`theme-${story.theme}`}>
  <StoryExperience story={story} />
</div>
```

---

## Database Migrations

**Run in Supabase SQL Editor:**

```sql
-- 1. Add columns to stories
ALTER TABLE stories
  ADD COLUMN auth_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN paid BOOLEAN DEFAULT false,
  ADD COLUMN stripe_payment_id TEXT,
  ADD COLUMN stripe_checkout_session_id TEXT,
  ADD COLUMN theme TEXT DEFAULT 'romantic' 
    CHECK (theme IN ('romantic', 'playful', 'elegant', 'modern'));

-- 2. Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies
-- (See separate SQL file for full policy definitions)
-- Key policies:
--   - Users can CRUD their own stories
--   - Public can SELECT published stories
--   - Users can CRUD chapters of their own stories
--   - Public can SELECT chapters of published stories

-- 4. Migrate existing data
-- Manual: Create first user via Supabase Auth dashboard
-- Then: UPDATE stories SET auth_user_id = '[first-user-id]' 
--       WHERE auth_user_id IS NULL;
```

---

## Implementation Timeline

**Total: 3 weeks** (assuming 15-20 hrs/week part-time)

### Week 1: Authentication
- Day 1-2: Supabase Auth setup, client updates
- Day 3-4: Login/signup pages, middleware
- Day 5: RLS policies, multi-user testing

**Checkpoint:** Can sign up, log in, create stories. Data isolated per user.

### Week 2: Monetization
- Day 6-7: Stripe integration, checkout flow
- Day 8: Webhook handler, payment validation
- Day 9: Dashboard payment badges
- Day 10: Publish flow with payment gate

**Checkpoint:** Can pay $12, unlock story, publish.

### Week 3: Themes & Polish
- Day 11-12: Design 4 themes (CSS variables)
- Day 13: Theme selection UI, preview component
- Day 14: Watermark on free tier, chapter limit enforcement
- Day 15: Testing, bug fixes, deploy

**Checkpoint:** All features working end-to-end. Ready to launch.

---

## Testing Checklist

**Authentication:**
- [ ] Sign up with email + password
- [ ] Sign up with magic link
- [ ] Log in after sign up
- [ ] Log out
- [ ] Session persists on refresh
- [ ] Middleware redirects unauthenticated users

**Multi-User Isolation:**
- [ ] User A cannot see User B's stories
- [ ] User A cannot access User B's story editor URL
- [ ] RLS prevents data leakage in database

**Monetization:**
- [ ] Can create story with unlimited chapters (free)
- [ ] Can build entire story without payment
- [ ] Can preview story without payment
- [ ] Publishing requires payment on first publish
- [ ] Payment flow works (Stripe test mode)
- [ ] Webhook updates story.published_at
- [ ] Can edit published story without additional payment
- [ ] Republishing doesn't charge again
- [ ] Shareable link works after publishing
- [ ] Creating second story requires another $6 to publish

**Themes:**
- [ ] Can select theme during story creation
- [ ] Can change theme from story settings
- [ ] All 4 themes render correctly
- [ ] Theme persists on recipient experience
- [ ] Dashboard not affected by theme

**Edge Cases:**
- [ ] Can create story with 1 chapter and publish (after payment)
- [ ] Can create story with 20+ chapters and publish (after payment)
- [ ] Payment fails gracefully, story stays unpublished
- [ ] Duplicate payments prevented (already published check)
- [ ] Invalid story ID in checkout → 404
- [ ] Editing published story updates link immediately
- [ ] Creating multiple stories requires payment for each

---

## Launch Checklist

**Pre-Launch:**
- [ ] Make GitHub repo private
- [ ] Audit code for exposed secrets
- [ ] Set up Stripe in live mode
- [ ] Configure Stripe webhook endpoint
- [ ] Test payment flow with real card (small amount)
- [ ] Set up error monitoring (Sentry optional)
- [ ] Manual database backup
- [ ] Prepare launch content (Twitter/LinkedIn post, blog)

**Launch Day:**
- [ ] Deploy to production
- [ ] Verify all environment variables set
- [ ] Test signup flow on production
- [ ] Test payment flow on production
- [ ] Test recipient experience on mobile
- [ ] Post launch announcement
- [ ] Monitor errors/logs

**Post-Launch:**
- [ ] Respond to all user feedback
- [ ] Fix critical bugs within 24 hours
- [ ] Monitor Stripe dashboard for payments
- [ ] Check Supabase usage (database size, MAU)
- [ ] Weekly user interviews

---

## Go-to-Market Strategy

### Positioning

**Not:** "The romantic anniversary app"

**Yes:** "Create interactive stories for the people who matter most"

**Origin Story Hook:**
> "I built this for my wife. Then her friends asked if they could use it. Turns out everyone has a story worth telling."

### Launch Channels

**Week 1:**
- X/Twitter + LinkedIn: Origin story + launch post
- Hacker News "Show HN"
- Reddit r/SideProject
- Direct outreach to 20 people

**Week 2-4:**
- 3-4 social posts/week showing different use cases
- User interviews (ask permission to share their stories)
- Blog post: "Why I built OurStory"
- Blog post: "How it works"

**Month 2:**
- SEO content: "meaningful gift ideas", "interactive storytelling"
- Feature user stories (with permission)
- Iterate based on feedback

### Key Messaging

**Homepage:**
- Headline: "Turn your story into an experience"
- Subhead: "Create interactive stories for the people who matter most"
- Show 3 example use cases (romantic, kids, friends)
- CTA: "Create Your First Story—Free"

**Social Media:**
- Lead with origin story
- Show product in action (screen recordings)
- Share use case examples (even hypothetical)
- Don't prescribe—let people discover uses

---

## Risks & Mitigations

**High Risk:**
- **Auth breaking existing flows**
  - Mitigation: Feature flag auth, test thoroughly, have rollback plan

- **Payment webhook failures**
  - Mitigation: Retry logic, manual reconciliation script, monitor Stripe dashboard

**Medium Risk:**
- **Low conversion rate (free → paid)**
  - Mitigation: A/B test pricing ($9 vs $12 vs $15), improve upgrade messaging

- **Theme design takes longer than expected**
  - Mitigation: Launch with 2 themes (Romantic + Modern), add others post-launch

**Low Risk:**
- **Vercel bandwidth limits**
  - Mitigation: Unlikely at launch scale, upgrade to Pro if needed

---

## Success Criteria

Phase 2 is complete when:

- [ ] 10+ users signed up
- [ ] 3+ story publications ($18+ revenue)
- [ ] All Phase 1 features working
- [ ] 4 themes designed and functional
- [ ] Zero critical bugs in 48 hours post-launch
- [ ] No user data leakage incidents
- [ ] Payment flow works end-to-end (test + production)
- [ ] Users can edit published stories without issues

**Revenue milestone:** $50+ in first month (validates willingness to pay)


---

## Key Decisions Made

1. ✅ Authentication via Supabase Auth (not custom)
2. ✅ Pay-per-publish model (not subscription, not per-chapter)
3. ✅ $6 per publish (not $5, $8, or $12)
4. ✅ Build for free, pay only to publish
5. ✅ Unlimited free edits after publishing (no republish fees)
6. ✅ No watermark (all published stories are premium)
7. ✅ 4 pre-designed themes (not infinite customization)
8. ✅ Living Story deferred to Phase 3
9. ✅ Broad positioning (not romantic-only)
10. ✅ Private GitHub repo

---

**End of PRD**

Ready to build.