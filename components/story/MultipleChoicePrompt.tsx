"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { MultipleChoiceConfig } from "@/lib/types/story";

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
      {config.question && (
        <p className="font-serif text-sm font-medium text-foreground">
          {config.question}
        </p>
      )}

      <div className="space-y-2">
        {config.options.map((option) => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            disabled={!!selected}
            className={cn(
              "w-full rounded-xl border px-4 py-3 text-left font-serif text-sm transition-all",
              selected === option
                ? "border-primary bg-primary text-primary-foreground"
                : selected
                  ? "border-border bg-muted/30 text-muted-foreground opacity-50"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
