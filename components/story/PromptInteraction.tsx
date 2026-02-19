"use client";

import { MultipleChoicePrompt } from "./MultipleChoicePrompt";
import { TextInputPrompt } from "./TextInputPrompt";
import { AudioPlaybackPrompt } from "./AudioPlaybackPrompt";
import { ImageRevealPrompt } from "./ImageRevealPrompt";
import type { Chapter } from "@/lib/types/story";

interface PromptInteractionProps {
  chapter: Chapter;
  onAnswer: (answer: string) => void;
  onReAnswer?: (answer: string) => void;
}

/**
 * Dispatches to the correct prompt component based on chapter.prompt_type.
 * Uses TypeScript's discriminated-union narrowing on prompt_type to safely
 * cast prompt_config to the right interface without runtime `as` casts.
 *
 * Returns null for prompt_type "none" — the parent handles Continue directly.
 */
export function PromptInteraction({
  chapter,
  onAnswer,
  onReAnswer,
}: PromptInteractionProps) {
  const { prompt_type, prompt_config } = chapter;

  if (prompt_type === "multiple_choice" && prompt_config) {
    return (
      <MultipleChoicePrompt
        config={prompt_config as import("@/lib/types/story").MultipleChoiceConfig}
        onAnswer={onAnswer}
      />
    );
  }

  if (prompt_type === "text_input" && prompt_config) {
    return (
      <TextInputPrompt
        config={prompt_config as import("@/lib/types/story").TextInputConfig}
        onAnswer={onAnswer}
        onReAnswer={onReAnswer}
      />
    );
  }

  if (prompt_type === "audio_playback" && prompt_config) {
    return (
      <AudioPlaybackPrompt
        config={prompt_config as import("@/lib/types/story").AudioPlaybackConfig}
        onAnswer={onAnswer}
      />
    );
  }

  if (prompt_type === "image_reveal" && prompt_config) {
    return (
      <ImageRevealPrompt
        config={prompt_config as import("@/lib/types/story").ImageRevealConfig}
        onAnswer={onAnswer}
      />
    );
  }

  // prompt_type === "none" → caller shows Continue directly
  return null;
}
