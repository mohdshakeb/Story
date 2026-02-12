"use client";

import {
  ListChecks,
  TextCursorInput,
  Headphones,
  ImageIcon,
  Ban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PromptType } from "@/lib/types/story";

const PROMPT_OPTIONS: {
  value: PromptType;
  label: string;
  icon: React.ElementType;
  description: string;
}[] = [
  {
    value: "none",
    label: "None",
    icon: Ban,
    description: "Continue to next chapter",
  },
  {
    value: "multiple_choice",
    label: "Multiple Choice",
    icon: ListChecks,
    description: "Pick from options",
  },
  {
    value: "text_input",
    label: "Text Input",
    icon: TextCursorInput,
    description: "Free-form response",
  },
  {
    value: "audio_playback",
    label: "Audio",
    icon: Headphones,
    description: "Listen to a clip",
  },
  {
    value: "image_reveal",
    label: "Image Reveal",
    icon: ImageIcon,
    description: "Tap to reveal image",
  },
];

interface PromptTypeSelectorProps {
  value: PromptType;
  onChange: (type: PromptType) => void;
}

export function PromptTypeSelector({
  value,
  onChange,
}: PromptTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {PROMPT_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors",
              isActive
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
