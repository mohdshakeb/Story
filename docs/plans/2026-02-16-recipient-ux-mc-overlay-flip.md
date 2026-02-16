# Recipient UX: MC Overlay + Image Flip Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix two recipient experience issues — (1) layout shift when MC options collapse, replaced with an opacity-0 overlay crossfade; (2) "tap to reveal" upgraded to a smooth CSS 3D card flip.

**Architecture:** `MultipleChoicePrompt` gets a `faded` prop that drives `opacity 1→0` animation while leaving the element in DOM flow (preserving chapter height). Integration text/image overlays using `position: absolute` above the invisible options. `ImageRevealPrompt` is fully rewritten to use `motion` `rotateY` with CSS `preserve-3d` / `backfaceVisibility`. Both components are rendered directly in `StoryExperience` (bypassing `PromptInteraction`) to allow prop control.

**Tech Stack:** `motion/react` (NOT `framer-motion`), Tailwind CSS v4, TypeScript strict, Next.js 15.5 App Router.

---

## Task 1: Add `faded` prop to MultipleChoicePrompt

**Files:**
- Modify: `components/story/MultipleChoicePrompt.tsx:8-31`

**Step 1: Add `faded` to the props interface and animate opacity**

Replace lines 8–31 with:

```tsx
interface MultipleChoicePromptProps {
  config: MultipleChoiceConfig;
  onAnswer: (answer: string) => void;
  faded?: boolean;
}

export function MultipleChoicePrompt({
  config,
  onAnswer,
  faded,
}: MultipleChoicePromptProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (option: string) => {
    if (selected) return; // lock after first choice
    setSelected(option);
    onAnswer(option);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: faded ? 0 : 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-4"
      style={faded ? { pointerEvents: "none" } : undefined}
    >
```

The rest of the component body (question `<p>`, options `<div>`) is unchanged.

**Step 2: Verify TypeScript**

```bash
npm run build 2>&1 | grep -E "error TS|MultipleChoicePrompt"
```

Expected: no errors mentioning `MultipleChoicePrompt`.

**Step 3: Commit**

```bash
git add components/story/MultipleChoicePrompt.tsx
git commit -m "feat: add faded prop to MultipleChoicePrompt for opacity overlay"
```

---

## Task 2: Rewrite ImageRevealPrompt with 3D card flip

**Files:**
- Modify: `components/story/ImageRevealPrompt.tsx` (full rewrite)

**Step 1: Replace entire file content**

```tsx
"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { ImageRevealConfig } from "@/lib/types/story";

interface ImageRevealPromptProps {
  config: ImageRevealConfig;
  onAnswer: (answer: string) => void;
  /** When true (restored/saved state), starts in flipped position with no animation */
  initialRevealed?: boolean;
}

/**
 * 3D card flip reveal. Front face = teaser, back face = image.
 * Both faces always in DOM (no AnimatePresence). The card rotates
 * via motion rotateY (0 → 180). Container height is pre-reserved
 * from the preloaded image aspect ratio.
 *
 * CSS 3D requires three cooperating properties on three elements:
 *   perspective — on outer wrapper (defines vanishing point)
 *   transformStyle: preserve-3d — on the rotating card (keeps children in 3D)
 *   backfaceVisibility: hidden — on each face (hides face when rotated past 90°)
 *
 * WebkitBackfaceVisibility is required for iOS Safari.
 */
export function ImageRevealPrompt({
  config,
  onAnswer,
  initialRevealed = false,
}: ImageRevealPromptProps) {
  const [revealed, setRevealed] = useState(initialRevealed);
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);

  // Preload image to measure aspect ratio — prevents layout jump on reveal
  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
      }
    };
    img.src = config.image_url;
  }, [config.image_url]);

  const handleReveal = () => {
    if (revealed) return;
    setRevealed(true);
    onAnswer("revealed");
  };

  return (
    // Outer: entrance opacity fade + aspect ratio reservation + perspective for 3D
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl"
      style={{
        ...(aspectRatio ? { aspectRatio } : { minHeight: "10rem" }),
        perspective: "1000px",
      }}
    >
      {/* Inner card: rotates around Y axis on tap */}
      <motion.div
        initial={{ rotateY: initialRevealed ? 180 : 0 }}
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Front face: teaser button */}
        <button
          onClick={handleReveal}
          disabled={revealed}
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 px-6 text-center hover:border-primary/50 hover:bg-primary/10 active:scale-[0.98]"
        >
          <span className="text-2xl">✨</span>
          <p className="font-serif text-base font-medium text-foreground">
            {config.reveal_text || "Tap to reveal…"}
          </p>
        </button>

        {/* Back face: revealed image (starts face-down via rotateY(180deg)) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.image_url}
            alt="Revealed"
            className="h-full w-full rounded-2xl object-cover"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
```

**Step 2: Verify TypeScript**

```bash
npm run build 2>&1 | grep -E "error TS|ImageRevealPrompt"
```

Expected: no errors.

**Step 3: Commit**

```bash
git add components/story/ImageRevealPrompt.tsx
git commit -m "feat: replace ImageRevealPrompt fade-swap with CSS 3D card flip"
```

---

## Task 3: Restructure StoryExperience prompt block

**Files:**
- Modify: `components/story/StoryExperience.tsx`

### Step 1: Add new imports (lines 9 and 14)

After `import { PromptInteraction }...` (line 9), add:
```tsx
import { MultipleChoicePrompt } from "./MultipleChoicePrompt";
import { ImageRevealPrompt } from "./ImageRevealPrompt";
```

On line 14, extend the type import to include `MultipleChoiceConfig` and `ImageRevealConfig`:
```tsx
import type { Story, Chapter, StoryCompletion, MultipleChoiceConfig, ImageRevealConfig } from "@/lib/types/story";
```

### Step 2: Replace the inner `<div>` prompt block (lines 426–493)

Find this exact opening tag (line 426):
```tsx
<div>
  <AnimatePresence>
    {!isSaved && !isNoneType &&
```

Replace everything from line 426 through line 493 (`</div>` before `</motion.div>`) with:

```tsx
<div>
  {/* MULTIPLE CHOICE: overlay crossfade. Options stay in DOM at opacity 0
      (preserving chapter height). Integration text / after_prompt image
      overlays via position:absolute — no height change, no snap jump. */}
  {!isSaved && chapter.prompt_type === "multiple_choice" && chapter.prompt_config && (
    <div className="relative overflow-visible">
      <MultipleChoicePrompt
        config={chapter.prompt_config as MultipleChoiceConfig}
        onAnswer={(answer) => handlePromptAnswer(idx, chapter, answer)}
        faded={state.step === "revealed"}
      />
      <AnimatePresence>
        {state.step === "revealed" && (
          <motion.div
            key="mc-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className="absolute top-0 left-0 right-0"
          >
            {integration?.hasTemplate && (
              <ViewerVoiceText
                text={integration.text}
                highlightSubstring={integration.answer}
              />
            )}
            {!integration?.hasTemplate &&
              chapter.image_url &&
              (chapter.image_position ?? "before_prompt") === "after_prompt" && (
                <ChapterImage url={chapter.image_url} delay={0} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )}

  {/* IMAGE REVEAL: 3D flip, rendered for both interactive + saved/restored state.
      initialRevealed starts it in the flipped (image) position when step=revealed. */}
  {chapter.prompt_type === "image_reveal" && chapter.prompt_config && (
    <ImageRevealPrompt
      config={chapter.prompt_config as ImageRevealConfig}
      onAnswer={(answer) => handlePromptAnswer(idx, chapter, answer)}
      initialRevealed={state.step === "revealed"}
    />
  )}

  {/* ALL OTHER TYPES (text_input, audio_playback): AnimatePresence unchanged.
      MC and image_reveal are handled above and excluded here. */}
  <AnimatePresence>
    {!isSaved && !isNoneType &&
      chapter.prompt_type !== "multiple_choice" &&
      chapter.prompt_type !== "image_reveal" &&
      (state.step === "prompt" ||
        chapter.prompt_type === "audio_playback" ||
        chapter.prompt_type === "text_input") && (
        <motion.div
          key="prompt"
          exit={
            chapter.prompt_type !== "audio_playback" &&
            chapter.prompt_type !== "text_input"
              ? { opacity: 0, transition: { duration: 0.2 } }
              : {}
          }
        >
          <PromptInteraction
            chapter={chapter}
            onAnswer={(answer) => handlePromptAnswer(idx, chapter, answer)}
          />
        </motion.div>
    )}
  </AnimatePresence>

  {/* After_prompt image — non-MC, non-none chapters only.
      MC after_prompt image is handled in the MC overlay above. */}
  {chapter.image_url &&
    chapter.prompt_type !== "none" &&
    chapter.prompt_type !== "multiple_choice" &&
    (chapter.image_position ?? "before_prompt") === "after_prompt" &&
    state.step === "revealed" && (
    <ChapterImage url={chapter.image_url} />
  )}
</div>
```

> **Key removals:**
> - The static `<img>` for `image_reveal` revealed state (lines 458–471 in original) — removed because `ImageRevealPrompt` now stays mounted showing the back face.
> - `ViewerVoiceText` for MC (lines 476–483 in original) — moved into the MC overlay block above.
> - `after_prompt` ChapterImage for MC chapters — moved into the MC overlay block above.

**Step 3: Verify TypeScript compiles clean**

```bash
npm run build 2>&1 | grep "error TS"
```

Expected: no output (clean build).

If errors appear, check:
- `MultipleChoiceConfig` and `ImageRevealConfig` are exported from `lib/types/story.ts` (they are — confirmed in exploration)
- `chapter.prompt_config as MultipleChoiceConfig` — the type assertion is correct since we already guard `chapter.prompt_type === "multiple_choice"`

**Step 4: Commit**

```bash
git add components/story/StoryExperience.tsx
git commit -m "feat: MC uses overlay crossfade, image_reveal uses 3D flip component"
```

---

## Task 4: Manual verification checklist

Run dev server:
```bash
npm run dev
```

Open `/dashboard/preview/[storyId]` or the public `/s/[slug]` link and test:

**MC layout stability:**
- [ ] Tap an MC option → options fade to invisible (no jump visible in scroll position)
- [ ] If chapter has `integration_template`: integration text fades in overlaid on top
- [ ] If chapter has `after_prompt` image and no template: image fades in overlaid on top
- [ ] If no template and no image: just faded options, inline answer appended to paragraph
- [ ] The chapter above and below do NOT shift position when the MC answer is selected

**Image reveal flip:**
- [ ] Tap the teaser card → 3D flip over ~600ms, image appears on back face
- [ ] No height change during or after flip
- [ ] Double-tap is no-op (button `disabled` + guard)
- [ ] Restored in-progress state: `image_reveal` chapter shows image (back face) directly, no animation

**Regression checks:**
- [ ] `audio_playback` chapters still work (play button shows, chevron advances)
- [ ] `text_input` chapters still work (type + submit, inline answer visible)
- [ ] `none` chapters still show chevron
- [ ] Completed/saved story view shows MC chapters with invisible options, image_reveal shows image

---

## Critical file reference

| File | Lines | Change |
|---|---|---|
| `components/story/MultipleChoicePrompt.tsx` | 8–31 | Add `faded` prop |
| `components/story/ImageRevealPrompt.tsx` | Full file | 3D flip rewrite |
| `components/story/StoryExperience.tsx` | 9, 14, 426–493 | Imports + restructure prompt block |
