"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: value.trim() ? 1 : 0.3 }}
          transition={{ duration: 0.3 }}
          className="flex justify-center pt-1"
        >
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            aria-label="Submit response"
            className="group flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed"
          >
            <motion.div
              animate={value.trim() ? { y: [0, 6, 0] } : {}}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="h-6 w-6" />
            </motion.div>
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
