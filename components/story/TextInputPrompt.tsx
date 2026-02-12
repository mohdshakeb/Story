"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import type { TextInputConfig } from "@/lib/types/story";

interface TextInputPromptProps {
  config: TextInputConfig;
  onAnswer: (answer: string) => void;
}

export function TextInputPrompt({ config, onAnswer }: TextInputPromptProps) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const maxLen = config.max_length ?? 200;

  const handleSubmit = () => {
    if (!value.trim() || submitted) return;
    setSubmitted(true);
    onAnswer(value.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-3"
    >
      {config.prompt && (
        <p className="font-serif text-sm font-medium text-foreground">
          {config.prompt}
        </p>
      )}

      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, maxLen))}
          onKeyDown={handleKeyDown}
          disabled={submitted}
          placeholder={config.placeholder || "Type your answer…"}
          rows={3}
          className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 font-serif text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
        />
        <span className="absolute bottom-2.5 right-3 text-xs text-muted-foreground">
          {value.length}/{maxLen}
        </span>
      </div>

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!value.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
        >
          Submit
          <ArrowRight className="h-4 w-4" />
        </button>
      )}

      {submitted && (
        <p className="text-center font-serif text-xs text-muted-foreground">
          ✓ Response recorded
        </p>
      )}
    </motion.div>
  );
}
