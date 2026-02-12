"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { StoryLanding } from "./StoryLanding";
import { ParagraphDisplay } from "./ParagraphDisplay";
import { IntegrationText } from "./IntegrationText";
import { PromptInteraction } from "./PromptInteraction";
import { ChapterImage } from "./ChapterImage";
import { ContinueButton } from "./ContinueButton";
import { ProgressIndicator } from "./ProgressIndicator";
import { FinalMessage } from "./FinalMessage";
import type { Story, Chapter } from "@/lib/types/story";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "landing" | "story" | "final";
type ChapterStep = "prompt" | "revealed";

interface ChapterState {
  step: ChapterStep;
  answer: string | null;
}

interface SavedProgress {
  chapterIndex: number;
  answers: Record<string, string>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function storageKey(storyId: string) {
  return `ourstory-${storyId}`;
}

function saveProgress(storyId: string, data: SavedProgress) {
  try {
    sessionStorage.setItem(storageKey(storyId), JSON.stringify(data));
  } catch {
    // sessionStorage unavailable (private browsing edge cases) — fail silently
  }
}

function loadProgress(storyId: string): SavedProgress | null {
  try {
    const raw = sessionStorage.getItem(storageKey(storyId));
    return raw ? (JSON.parse(raw) as SavedProgress) : null;
  } catch {
    return null;
  }
}

function clearProgress(storyId: string) {
  try {
    sessionStorage.removeItem(storageKey(storyId));
  } catch {
    // ignore
  }
}

function hasIntegration(chapter: Chapter): boolean {
  if (
    chapter.prompt_type !== "multiple_choice" &&
    chapter.prompt_type !== "text_input"
  )
    return false;
  const cfg = chapter.prompt_config as
    | { integration_template?: string }
    | null;
  return !!cfg?.integration_template?.trim();
}

// ─── Main component ───────────────────────────────────────────────────────────

interface StoryExperienceProps {
  story: Story;
}

export function StoryExperience({ story }: StoryExperienceProps) {
  const chapters: Chapter[] = story.chapters ?? [];

  // ── State ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("landing");
  const [chapterIndex, setChapterIndex] = useState(0);
  const [chapterStates, setChapterStates] = useState<
    Record<number, ChapterState>
  >({});
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // ── Restore sessionStorage progress ───────────────────────────────────────
  useEffect(() => {
    const saved = loadProgress(story.id);
    if (saved && saved.chapterIndex > 0) {
      setPhase("story");
      setChapterIndex(Math.min(saved.chapterIndex, chapters.length - 1));
      setAnswers(saved.answers ?? {});
    }
  }, [story.id, chapters.length]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const chapter = chapters[chapterIndex];
  const state = chapterStates[chapterIndex] ?? {
    step: "prompt" as ChapterStep,
    answer: null,
  };
  const isNoneType = chapter?.prompt_type === "none";

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleBegin = () => {
    setPhase("story");
  };

  const handlePromptAnswer = (answer: string) => {
    if (!chapter) return;
    const newAnswers = { ...answers, [chapter.id]: answer };
    setAnswers(newAnswers);
    setChapterStates((prev) => ({
      ...prev,
      [chapterIndex]: { step: "revealed", answer },
    }));
    saveProgress(story.id, { chapterIndex, answers: newAnswers });
  };

  const handleContinue = () => {
    if (chapterIndex < chapters.length - 1) {
      const next = chapterIndex + 1;
      setChapterIndex(next);
      setChapterStates((prev) => ({
        ...prev,
        [next]: { step: "prompt", answer: null },
      }));
      saveProgress(story.id, { chapterIndex: next, answers });
    } else {
      setPhase("final");
      clearProgress(story.id);
    }
  };

  // ── Render: Landing ────────────────────────────────────────────────────────
  if (phase === "landing") {
    return <StoryLanding story={story} onBegin={handleBegin} />;
  }

  // ── Render: Final ──────────────────────────────────────────────────────────
  if (phase === "final") {
    return <FinalMessage story={story} />;
  }

  // ── Render: Story ──────────────────────────────────────────────────────────
  if (!chapter) return null;

  const integration =
    state.step === "revealed" &&
    state.answer &&
    hasIntegration(chapter) &&
    (chapter.prompt_type === "multiple_choice" ||
      chapter.prompt_type === "text_input")
      ? (chapter.prompt_config as { integration_template?: string })
          ?.integration_template ?? null
      : null;

  return (
    <div className="min-h-screen bg-background px-5 py-8">
      {/* ── Progress ─────────────────────────────────────────── */}
      <div className="mb-8">
        <ProgressIndicator total={chapters.length} current={chapterIndex} />
      </div>

      {/* ── Chapter with cross-fade transition ────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={chapterIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="mx-auto max-w-sm space-y-6 pb-12"
        >
          {/* Paragraph */}
          <ParagraphDisplay text={chapter.paragraph_text} />

          {/* Prompt interaction (hidden in "revealed" step) */}
          {state.step === "prompt" && !isNoneType && (
            <PromptInteraction
              chapter={chapter}
              onAnswer={handlePromptAnswer}
            />
          )}

          {/* Integration text (revealed step, if template exists) */}
          {state.step === "revealed" &&
            integration &&
            state.answer &&
            (chapter.prompt_type === "multiple_choice" ||
              chapter.prompt_type === "text_input") && (
              <IntegrationText
                template={integration}
                answer={state.answer}
                promptType={chapter.prompt_type}
              />
            )}

          {/* Chapter image (revealed step, or always if no prompt) */}
          {(state.step === "revealed" || isNoneType) &&
            chapter.image_url && (
              <ChapterImage url={chapter.image_url} />
            )}

          {/* Continue button */}
          {(state.step === "revealed" || isNoneType) && (
            <ContinueButton
              onClick={handleContinue}
              label={
                chapterIndex < chapters.length - 1
                  ? "Continue"
                  : "See your message"
              }
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

