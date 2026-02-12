# PRD: OurStory - Phase 1 (Prototype)

## Part 1: Overview, Architecture & Data Model

**Document Version:** 1.0  
**Last Updated:** February 11, 2026  
**Author:** Shakeb  
**Target Completion:** February 19, 2026

---

## 1. Executive Summary

### Product Name
**OurStory** (working title)

### Purpose
A web application that enables users to create interactive, narrative-based story experiences for their loved ones. Users build multi-chapter stories with embedded prompts, media, and a final message, then share via a unique link.

### Phase 1 Goal
Build a fully functional prototype for a single user (Shakeb) to create and share one story with his wife by February 19th, 2026. Architecture should support future SaaS expansion with minimal refactoring.

### Target Users (Phase 1)
- **Primary:** Shakeb (story creator)
- **Secondary:** His wife (story recipient)

### Success Metrics
- ✅ Story created and deployed by Feb 19th
- ✅ Shareable link works flawlessly
- ✅ Recipient completes story experience without friction
- ✅ Code architecture supports Phase 2+ expansion

---

## 2. Technical Architecture

### Tech Stack

**Frontend:**
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion (animations)
- React Hook Form (form handling)

**Backend:**
- Next.js API Routes (serverless functions)
- Supabase (PostgreSQL database + Storage + Auth)

**Hosting:**
- Vercel (application)
- Supabase (database & file storage)

**Key Libraries:**
- `@supabase/supabase-js` (database client)
- `react-hook-form` + `zod` (form validation)
- `framer-motion` (animations)
- `lucide-react` (icons)

### Architecture Principles

1. **Separation of Concerns:**
   - UI components independent of data layer
   - Clean data access layer (`lib/data/storage.ts`)
   - Type-safe interfaces throughout

2. **SaaS-Ready Structure:**
   - Code written as if multi-user already exists
   - Auth layer "bypassed" in Phase 1, easily added in Phase 2
   - Database schema includes `user_id` (always set to single user for now)

3. **Mobile-First:**
   - All experiences optimized for mobile viewport
   - Responsive design for desktop fallback
   - Touch-friendly interactions

---

## 3. Database Schema

### Supabase Tables

```sql
-- Users table (for future, single user in Phase 1)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stories table
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  occasion TEXT, -- 'anniversary', 'birthday', etc.
  recipient_name TEXT,
  final_message_type TEXT NOT NULL, -- 'text', 'image', 'video', 'combination'
  final_message_content TEXT, -- JSON or text content
  final_message_media_url TEXT, -- URL if image/video
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chapters table
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  title TEXT, -- Optional, for creator reference
  paragraph_text TEXT NOT NULL,
  image_url TEXT, -- Main chapter image (appears after prompt)
  background_image_url TEXT, -- Optional background
  prompt_type TEXT NOT NULL, -- 'multiple_choice', 'text_input', 'audio_playback', 'image_reveal', 'none'
  prompt_config JSONB, -- Stores prompt-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(story_id, order_index)
);

-- Indexes for performance
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_slug ON stories(slug);
CREATE INDEX idx_chapters_story_id ON chapters(story_id);
CREATE INDEX idx_chapters_order ON chapters(story_id, order_index);
```

### Prompt Config JSON Structure

Different structures based on `prompt_type`:

**Multiple Choice:**
```json
{
  "question": "What was going through my mind?",
  "options": [
    "nervous excitement",
    "complete certainty",
    "quiet wonder"
  ],
  "integration_template": "I was feeling **[choice]** as we..."
}
```

**Text Input:**
```json
{
  "prompt": "Complete this: 'When I'm with you, I feel...'",
  "placeholder": "your words here",
  "max_length": 50,
  "integration_template": "When I'm with you, I feel **[response]**"
}
```

**Audio Playback:**
```json
{
  "button_text": "Play to hear what I was thinking",
  "audio_url": "https://supabase.../audio.mp3"
}
```

**Image Reveal:**
```json
{
  "reveal_text": "Tap to see what I saw",
  "image_url": "https://supabase.../image.jpg"
}
```

**None:**
```json
null
```

### Supabase Storage Buckets

```
story-images/         # Chapter images
  {story_id}/
    chapter-{order}.jpg
    background-{order}.jpg
    
story-audio/          # Audio files for prompts
  {story_id}/
    chapter-{order}.mp3
    
final-messages/       # Final message media
  {story_id}/
    final.jpg / final.mp4
```

**Bucket Policies:**
- Public read access (for recipient experience)
- Authenticated write access (for creator dashboard)

---

## 4. Data Models (TypeScript)

```typescript
// types/story.ts

export type PromptType = 
  | 'multiple_choice' 
  | 'text_input' 
  | 'audio_playback' 
  | 'image_reveal' 
  | 'none';

export type FinalMessageType = 
  | 'text' 
  | 'image' 
  | 'video' 
  | 'combination';

export interface Story {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  occasion?: string;
  recipient_name?: string;
  final_message_type: FinalMessageType;
  final_message_content?: string;
  final_message_media_url?: string;
  published: boolean;
  created_at: string;
  updated_at: string;
  chapters?: Chapter[];
}

export interface Chapter {
  id: string;
  story_id: string;
  order_index: number;
  title?: string;
  paragraph_text: string;
  image_url?: string;
  background_image_url?: string;
  prompt_type: PromptType;
  prompt_config?: PromptConfig;
  created_at: string;
  updated_at: string;
}

export type PromptConfig = 
  | MultipleChoiceConfig 
  | TextInputConfig 
  | AudioPlaybackConfig 
  | ImageRevealConfig 
  | null;

export interface MultipleChoiceConfig {
  question: string;
  options: string[];
  integration_template: string;
}

export interface TextInputConfig {
  prompt: string;
  placeholder: string;
  max_length: number;
  integration_template: string;
}

export interface AudioPlaybackConfig {
  button_text: string;
  audio_url: string;
}

export interface ImageRevealConfig {
  reveal_text: string;
  image_url: string;
}

// Response tracking (for analytics in future phases)
export interface ChapterResponse {
  id: string;
  story_id: string;
  chapter_id: string;
  response_data: string; // JSON stringified response
  timestamp: string;
}
```

---

## 5. File Structure

```
/app
  layout.tsx                    # Root layout
  page.tsx                      # Landing/redirect to dashboard
  
  /dashboard
    layout.tsx                  # Dashboard layout
    page.tsx                    # Story list (view all stories)
    
    /create
      page.tsx                  # Create new story form
    
    /story/[storyId]
      page.tsx                  # Edit story overview
      
      /chapter/[chapterOrder]
        page.tsx                # Edit individual chapter
    
    /preview/[storyId]
      page.tsx                  # Preview story as recipient would see
  
  /s/[slug]
    page.tsx                    # Public story experience (recipient view)

/components
  /ui                           # shadcn/ui components
    button.tsx
    input.tsx
    textarea.tsx
    select.tsx
    card.tsx
    dialog.tsx
    
  /dashboard
    StoryCard.tsx               # Story preview card
    StoryList.tsx               # List of stories
    ChapterEditor.tsx           # Chapter editing form
    PromptSelector.tsx          # Prompt type selector
    PromptConfigEditor.tsx      # Dynamic form for prompt config
    MediaUploader.tsx           # Image/audio upload component
    FinalMessageEditor.tsx      # Final message configuration
    
  /story
    ChapterView.tsx             # Single chapter display
    PromptInteraction.tsx       # Handles all prompt types
    ProgressIndicator.tsx       # Chapter progress dots
    FinalMessage.tsx            # Final message display
    
/lib
  /supabase
    client.ts                   # Supabase client initialization
    server.ts                   # Server-side Supabase client
    
  /data
    storage.ts                  # Data access layer (CRUD operations)
    
  /utils
    slugGenerator.ts            # Generate unique slugs
    imageUpload.ts              # Handle image uploads to Supabase
    audioUpload.ts              # Handle audio uploads
    validation.ts               # Zod schemas for validation
    
  /types
    story.ts                    # TypeScript types (from section 4)
    
/public
  /fonts                        # Custom fonts if needed
  
/.env.local
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
```

---

## 6. Core User Flows

### Flow 1: Create New Story

```
Dashboard → Click "Create Story" → 
Fill basic info (title, occasion, recipient name) → 
Save → Redirect to story editor
```

### Flow 2: Build Chapters

```
Story editor → "Add Chapter" → 
Write paragraph → 
Select prompt type → 
Configure prompt (options/text/audio) → 
Upload chapter image → 
Save chapter → 
"Add Next Chapter" or "Continue to Final Message"
```

### Flow 3: Configure Final Message

```
All chapters done → "Final Message" → 
Select type (text/image/video/combination) → 
Write/upload content → 
Save → "Publish Story"
```

### Flow 4: Share Story

```
Publish story → 
Generate unique slug → 
Copy shareable link → 
Share with recipient
```

### Flow 5: Recipient Experience

```
Open link → 
Landing screen → 
"Begin" → 
Read chapter 1 → 
Interact with prompt → 
See image reveal → 
Continue to chapter 2 → 
... → 
Final chapter → 
Final message → 
"Experience Complete"
```

---

## 7. Key Design Decisions

### Why Supabase?
- Built-in authentication (ready for Phase 2)
- Built-in storage for media files
- Larger free tier than Vercel Postgres
- Not locked to Vercel ecosystem
- Real-time capabilities (for future features)

### Why Next.js App Router?
- Server components for better performance
- Built-in API routes
- Excellent TypeScript support
- Great developer experience

### Why Mobile-First?
- Primary use case is mobile recipient experience
- Most users will share links via mobile messaging
- Easier to scale up to desktop than down to mobile

---

## 8. Phase 1 Constraints & Simplifications

### What's NOT in Phase 1

❌ Multi-user support (authentication required)  
❌ Payment processing  
❌ User account management  
❌ Analytics dashboard  
❌ Email notifications  
❌ Social sharing features  
❌ Story templates  
❌ Present hunt feature (moved to Phase 1.5)

### What IS in Phase 1

✅ Single-user dashboard  
✅ Full chapter builder with all prompt types  
✅ Media upload (images, audio)  
✅ Final message configuration  
✅ Shareable link generation  
✅ Complete recipient experience  
✅ Mobile-responsive design  
✅ SaaS-ready code architecture

---

## 9. Success Criteria

### Technical Success
- [ ] Application deployed to Vercel
- [ ] Database and storage configured in Supabase
- [ ] All CRUD operations working
- [ ] Media uploads functioning
- [ ] Shareable links accessible

### User Experience Success
- [ ] Creator can build a story in under 30 minutes
- [ ] Recipient experience is smooth on mobile
- [ ] No broken links or errors
- [ ] Images load quickly
- [ ] Animations are smooth

### Code Quality Success
- [ ] TypeScript strict mode enabled
- [ ] No `any` types
- [ ] All components properly typed
- [ ] Clean separation of concerns
- [ ] Ready for Phase 2 expansion

---

## 10. Risk Assessment

### High Risk
**Database connection issues**  
*Mitigation:* Test Supabase connection early, use connection pooling

**Media upload failures**  
*Mitigation:* Implement proper error handling, show upload progress

**Mobile compatibility issues**  
*Mitigation:* Test on actual mobile devices early

### Medium Risk
**Timeline pressure (8 days)**  
*Mitigation:* Focus on MVP features, cut nice-to-haves

**Slug collision**  
*Mitigation:* Use nanoid or similar for unique slug generation

### Low Risk
**Vercel deployment issues**  
*Mitigation:* Standard Next.js deployment, well-documented

---

**End of Part 1**

Part 2 will cover:
- Detailed feature specifications
- UI/UX requirements  
- API endpoint definitions
- Development timeline
- Testing strategy
