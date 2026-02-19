"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { StoryLanding } from "./StoryLanding";
import { ParagraphDisplay } from "./ParagraphDisplay";
import { ViewerVoiceText } from "./ViewerVoiceText";
import { PromptInteraction } from "./PromptInteraction";
import { MultipleChoicePrompt } from "./MultipleChoicePrompt";
import { ImageRevealPrompt } from "./ImageRevealPrompt";
import { ChapterImage } from "./ChapterImage";
import { FinalMessage } from "./FinalMessage";
import { StoryExport } from "./StoryExport";
import { saveStoryCompletionAction } from "@/actions/story-actions";
import type { Story, Chapter, StoryCompletion, MultipleChoiceConfig, ImageRevealConfig } from "@/lib/types/story";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "landing" | "story";
type ChapterStep = "prompt" | "revealed";

interface ChapterState {
  step: ChapterStep;
  answer: string | null;
}

interface SavedProgress {
  chapterIndex: number;
  answers: Record<string, string>;
  saved?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function storageKey(storyId: string) {
  return `ourstory-${storyId}`;
}

function saveProgress(storyId: string, data: SavedProgress) {
  try {
    localStorage.setItem(storageKey(storyId), JSON.stringify(data));
  } catch {
    // localStorage unavailable (private browsing edge cases) — fail silently
  }
}

function loadProgress(storyId: string): SavedProgress | null {
  try {
    const raw = localStorage.getItem(storageKey(storyId));
    return raw ? (JSON.parse(raw) as SavedProgress) : null;
  } catch {
    return null;
  }
}

function clearProgress(storyId: string) {
  try {
    localStorage.removeItem(storageKey(storyId));
  } catch {
    // ignore
  }
}

interface IntegrationResult {
  text: string;
  hasTemplate: boolean;
  answer: string;
}

/** Returns structured integration data for the viewer's answer display */
function getIntegration(chapter: Chapter, state: ChapterState): IntegrationResult | null {
  if (
    state.step !== "revealed" ||
    !state.answer ||
    (chapter.prompt_type !== "multiple_choice" &&
      chapter.prompt_type !== "text_input")
  )
    return null;

  // text_input: always raw answer, no template
  if (chapter.prompt_type === "text_input") {
    return { text: state.answer, hasTemplate: false, answer: state.answer };
  }

  // multiple_choice: check for integration_template
  const cfg = chapter.prompt_config as
    | { integration_template?: string }
    | null;
  const tmpl = cfg?.integration_template?.trim() ?? "";

  if (tmpl) {
    const rendered = tmpl.replace("[choice]", state.answer);
    return { text: rendered, hasTemplate: true, answer: state.answer };
  }
  return { text: state.answer, hasTemplate: false, answer: state.answer };
}

/** Whether a chapter type needs a manual chapter-level chevron to advance.
 * Only "none" — all other types have their own advance mechanism. */
function needsChevron(chapter: Chapter): boolean {
  return chapter.prompt_type === "none";
}

// Delay (ms) after answer before auto-advancing to next chapter
const AUTO_ADVANCE_DELAY = 800;

// ─── Scroll utility ───────────────────────────────────────────────────────────

function smoothScrollToTop(
  container: HTMLElement,
  target: HTMLElement,
  duration: number,
  rafRef: { current: number | null }
) {
  if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  // Align the target's top to the container's top (+ 24px breathing room)
  const scrollDelta = targetRect.top - containerRect.top - 24;

  const startScroll = container.scrollTop;
  const startTime = performance.now();

  // Disable scroll-snap during animation to prevent the browser's snap engine
  // from jerking to the nearest snap point when our RAF loop ends
  container.style.scrollSnapType = "none";

  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function tick(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    container.scrollTop = startScroll + scrollDelta * easeInOutCubic(progress);
    if (progress < 1) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
      // Re-enable scroll-snap (clears inline override, CSS class takes effect)
      container.style.scrollSnapType = "";
    }
  }

  rafRef.current = requestAnimationFrame(tick);
}

// ─── Main component ───────────────────────────────────────────────────────────

interface StoryExperienceProps {
  story: Story;
  completion?: StoryCompletion | null;
}

export function StoryExperience({ story, completion }: StoryExperienceProps) {
  const chapters: Chapter[] = useMemo(
    () => story.chapters ?? [],
    [story.chapters]
  );

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("landing");
  const [revealedCount, setRevealedCount] = useState(1);
  const [chapterStates, setChapterStates] = useState<
    Record<number, ChapterState>
  >({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestored, setIsRestored] = useState(false);
  const [showExport, setShowExport] = useState(false);
  // Pre-calculated rendered heights for MC after_prompt images (chapter index → px).
  // Computed on mount so the container is already the right size before the user answers.
  const [mcAfterPromptHeights, setMcAfterPromptHeights] = useState<Record<number, number>>({});

  // ── Refs ────────────────────────────────────────────────────────────────────
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const finalRef = useRef<HTMLDivElement>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRevealedRef = useRef(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);

  // ── Cleanup advance timer on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  // ── Pre-load after_prompt images for MC chapters ─────────────────────────────
  // inner width of max-w-sm (384px) minus px-5 padding (2×20px) = 344px
  const MC_INNER_WIDTH = 344;
  useEffect(() => {
    const heights: Record<number, number> = {};
    let pending = 0;
    chapters.forEach((chapter, idx) => {
      if (
        chapter.prompt_type === "multiple_choice" &&
        chapter.image_url &&
        (chapter.image_position ?? "before_prompt") === "after_prompt"
      ) {
        pending++;
        const img = new window.Image();
        img.onload = () => {
          if (img.naturalWidth && img.naturalHeight) {
            heights[idx] = Math.round(MC_INNER_WIDTH * img.naturalHeight / img.naturalWidth);
          }
          pending--;
          if (pending === 0) setMcAfterPromptHeights(heights);
        };
        img.onerror = () => {
          pending--;
          if (pending === 0) setMcAfterPromptHeights(heights);
        };
        img.src = chapter.image_url;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Restore progress (priority: localStorage.saved → inProgress → DB → landing)
  useEffect(() => {
    const local = loadProgress(story.id);

    // Helper: set all chapters to revealed with given answers
    const restoreCompleted = (ans: Record<string, string>) => {
      setPhase("story");
      const count = chapters.length + 1; // +1 to show final message
      setRevealedCount(count);
      prevRevealedRef.current = count;
      const states: Record<number, ChapterState> = {};
      for (let i = 0; i < chapters.length; i++) {
        states[i] = { step: "revealed", answer: ans[chapters[i]?.id] ?? null };
      }
      setChapterStates(states);
      setAnswers(ans);
      setIsSaved(true);
    };

    if (local?.saved) {
      // 1. Saved locally — show completed view
      restoreCompleted(local.answers ?? {});
    } else if (local && local.chapterIndex > 0) {
      // 2. In-progress — restore to saved chapter
      setPhase("story");
      const restoreIdx = Math.min(local.chapterIndex, chapters.length - 1);
      setRevealedCount(restoreIdx + 1);
      prevRevealedRef.current = restoreIdx + 1;

      const restoredStates: Record<number, ChapterState> = {};
      for (let i = 0; i <= restoreIdx; i++) {
        restoredStates[i] = {
          step: "revealed",
          answer: local.answers?.[chapters[i]?.id] ?? null,
        };
      }
      if (!local.answers?.[chapters[restoreIdx]?.id]) {
        restoredStates[restoreIdx] = { step: "prompt", answer: null };
      }
      setChapterStates(restoredStates);
      setAnswers(local.answers ?? {});
      setIsRestored(true);
    } else if (completion) {
      // 3. No local state, DB has completion — show completed view
      restoreCompleted(completion.answers ?? {});
    }
    // 4. Nothing — stay on landing (default)
  }, [story.id, chapters, completion]);

  // Scroll to the last chapter after restore render
  useEffect(() => {
    if (!isRestored) return;
    const lastIdx = revealedCount - 1;
    requestAnimationFrame(() => {
      chapterRefs.current[lastIdx]?.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
    });
    setIsRestored(false);
  }, [isRestored, revealedCount]);

  // ── Scroll to newly revealed chapter (runs after render, not in updater) ────
  useEffect(() => {
    if (phase !== "story") return;
    if (revealedCount <= prevRevealedRef.current) {
      prevRevealedRef.current = revealedCount;
      return;
    }
    prevRevealedRef.current = revealedCount;

    const showingFinal = revealedCount > chapters.length;
    const target = showingFinal
      ? finalRef.current
      : chapterRefs.current[revealedCount - 1];

    if (!target) return;
    // Delay slightly so the entrance animation has started (element is in DOM
    // at full height) before scrollIntoView calculates the position
    const timer = setTimeout(() => {
      const container = scrollContainerRef.current;
      if (container) smoothScrollToTop(container, target, 700, scrollRafRef);
    }, 50);
    return () => clearTimeout(timer);
  }, [revealedCount, phase, chapters.length]);

  // ── Advance to next chapter or final message ────────────────────────────────
  const advanceToNext = useCallback(() => {
    saveProgress(story.id, { chapterIndex: revealedCount, answers });
    setRevealedCount((prev) => prev + 1);
  }, [revealedCount, story.id, answers]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleBegin = () => {
    setPhase("story");
  };

  const handlePromptAnswer = useCallback(
    (chapterIdx: number, chapter: Chapter, answer: string) => {
      const newAnswers = { ...answers, [chapter.id]: answer };
      setAnswers(newAnswers);
      setChapterStates((prev) => ({
        ...prev,
        [chapterIdx]: { step: "revealed", answer },
      }));
      saveProgress(story.id, { chapterIndex: chapterIdx, answers: newAnswers });

      // text_input: advance immediately — the chevron is purely navigational,
      // so scroll starts before the chevron exit animation completes (~300ms),
      // making the height change invisible since the viewport has scrolled away.
      if (chapter.prompt_type === "text_input") {
        advanceToNext();
      } else if (
        chapter.prompt_type === "multiple_choice" ||
        chapter.prompt_type === "audio_playback" ||
        chapter.prompt_type === "image_reveal"
      ) {
        advanceTimerRef.current = setTimeout(advanceToNext, AUTO_ADVANCE_DELAY);
      }
    },
    [answers, story.id, advanceToNext]
  );

  // ── Re-answer: update a previously submitted text_input answer ───────────
  const handleReAnswer = useCallback(
    (chapterIdx: number, chapter: Chapter, newAnswer: string) => {
      const newAnswers = { ...answers, [chapter.id]: newAnswer };
      setAnswers(newAnswers);
      setChapterStates((prev) => ({
        ...prev,
        [chapterIdx]: { step: "revealed", answer: newAnswer },
      }));
      saveProgress(story.id, { chapterIndex: revealedCount, answers: newAnswers });
    },
    [answers, story.id, revealedCount]
  );

  // ── Save / Reset handlers ──────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    const result = await saveStoryCompletionAction(story.id, answers);
    if (result.success) {
      setIsSaved(true);
      saveProgress(story.id, {
        chapterIndex: chapters.length,
        answers,
        saved: true,
      });
    }
    setIsSaving(false);
  }, [story.id, answers, chapters.length]);

  const handleReset = useCallback(() => {
    clearProgress(story.id);
    setPhase("landing");
    setRevealedCount(1);
    prevRevealedRef.current = 1;
    setChapterStates({});
    setAnswers({});
    setIsSaved(false);
  }, [story.id]);

  // ── Render: Landing ────────────────────────────────────────────────────────
  if (phase === "landing") {
    return <StoryLanding story={story} onBegin={handleBegin} />;
  }

  // ── Render: Story (continuous scroll) ──────────────────────────────────────
  const showFinal = revealedCount > chapters.length;

  return (
    <div
      ref={scrollContainerRef}
      className="scroll-snap-y-proximity h-[100dvh] overflow-y-auto bg-background pt-8 pb-[30vh]"
    >
      {chapters.slice(0, revealedCount).map((chapter, idx) => {
        const state = chapterStates[idx] ?? {
          step: "prompt" as ChapterStep,
          answer: null,
        };
        const isNoneType = chapter.prompt_type === "none";
        const isLastRevealed = idx === revealedCount - 1;
        const integration = getIntegration(chapter, state);
        const showChevron =
          !isSaved &&
          needsChevron(chapter) &&
          isLastRevealed &&
          !showFinal;

        return (
          <div
            key={chapter.id}
            ref={(el) => {
              chapterRefs.current[idx] = el;
            }}
            className="scroll-snap-align-start mx-auto max-w-sm px-5"
          >
            {/* ── Chapter divider (between chapters) ──────────── */}
            {idx > 0 && (
              <motion.div
                initial={isSaved ? false : { scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mx-auto my-8 h-px w-16 origin-center bg-border/50"
              />
            )}

            <motion.div
              className="space-y-6"
              initial={!isSaved && isLastRevealed ? { opacity: 0 } : false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {/* Chapter title */}
              <p className="font-serif text-xs uppercase tracking-widest text-muted-foreground">
                {chapter.title?.trim() || `Chapter ${idx + 1}`}
              </p>

              {/* Paragraph — with inline append for MC-no-template */}
              <ParagraphDisplay
                text={chapter.paragraph_text}
                inlineAppend={
                  state.step === "revealed" &&
                    integration !== null &&
                    !integration.hasTemplate &&
                    chapter.prompt_type === "multiple_choice"
                    ? { text: integration.answer }
                    : undefined
                }
              />

              {/* Chapter image — before prompt (default) */}
              {chapter.image_url &&
                (chapter.prompt_type === "none" ||
                  (chapter.image_position ?? "before_prompt") === "before_prompt") && (
                  <ChapterImage
                    url={chapter.image_url}
                    delay={isLastRevealed && !isSaved ? 0.4 : 0}
                  />
                )}

              {/* Prompt interaction — shown in "prompt" state for all types,
                  AND in "revealed" state for audio_playback/text_input so
                  they stay mounted. No layout animation — AnimatePresence
                  handles opacity transitions; height changes are instant. */}
              <motion.div
                initial={isLastRevealed && !isSaved ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: isLastRevealed && !isSaved ? 0.8 : 0 }}
              >
              <div>
                {/* MULTIPLE CHOICE: overlay crossfade. Options stay in DOM at opacity 0
                    (preserving chapter height). Integration text / after_prompt image
                    overlays via position:absolute — no height change, no snap jump. */}
                {!isSaved && chapter.prompt_type === "multiple_choice" && chapter.prompt_config && (
                  <div
                    className="relative overflow-hidden"
                    style={mcAfterPromptHeights[idx] ? { minHeight: mcAfterPromptHeights[idx] } : undefined}
                  >
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
                          className="absolute inset-0 flex items-center"
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
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={chapter.image_url}
                                alt=""
                                className="h-full w-full rounded-2xl object-cover"
                              />
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
                          onAnswer={(answer) =>
                            handlePromptAnswer(idx, chapter, answer)
                          }
                          onReAnswer={(answer) =>
                            handleReAnswer(idx, chapter, answer)
                          }
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
              </motion.div>

              {/* Down-arrow chevron for none/audio/image types */}
              {showChevron && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.0 }}
                  className="flex justify-center pt-4"
                >
                  <button
                    onClick={advanceToNext}
                    className="group flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={
                      idx === chapters.length - 1
                        ? "See your message"
                        : "Continue"
                    }
                  >
                    <motion.div
                      animate={{ y: [0, 6, 0] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      <ChevronDown className="h-6 w-6" />
                    </motion.div>
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>
        );
      })}

      {/* ── Final message (last item in scroll) ──────────────────── */}
      {showFinal && (
        <motion.div
          ref={finalRef}
          className="scroll-snap-align-start"
          initial={isSaved ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <FinalMessage story={story} />

          {/* ── Completion actions ────────────────────────────── */}
          <div className="mx-auto max-w-xs px-6 pb-16 pt-4">
            {!isSaved ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1.5 }}
                className="space-y-3"
              >
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full rounded-xl bg-primary py-3 font-serif text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
                >
                  {isSaving ? "Saving…" : "Save My Story"}
                </button>
                <button
                  onClick={handleReset}
                  className="w-full rounded-xl py-2.5 font-serif text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Reset
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-3"
              >
                <button
                  onClick={() => setShowExport(true)}
                  className="w-full rounded-xl bg-primary py-3 font-serif text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
                >
                  Share Your Story
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Export sheet ───────────────────────────────────────── */}
      <StoryExport
        chapters={chapters}
        answers={answers}
        storyTitle={story.title}
        open={showExport}
        onClose={() => setShowExport(false)}
      />
    </div>
  );
}
