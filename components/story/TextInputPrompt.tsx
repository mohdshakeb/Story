"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import type { TextInputConfig } from "@/lib/types/story";

interface TextInputPromptProps {
  config: TextInputConfig;
  onAnswer: (answer: string) => void;
}

/**
 * Inline text input — no textarea box. Placeholder text shows below the
 * paragraph; tap to focus and type. Text renders in viewer-voice styling.
 * Uses a transparent <textarea> over a styled mirror div for native input.
 * After submit, the DOM stays identical — textarea just becomes disabled.
 */
export function TextInputPrompt({ config, onAnswer }: TextInputPromptProps) {
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasText = value.trim().length > 0;
  const maxLen = config.max_length ?? 500;

  // Sync textarea height to mirror div height
  useEffect(() => {
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!ta || !mirror) return;
    ta.style.height = mirror.offsetHeight + "px";
  }, [value]);

  // Keep textarea + chevron visible above the soft keyboard on mobile.
  // visualViewport fires 'resize' when the keyboard opens/closes; scrollIntoView
  // with block:'end' nudges the scroll container just enough to clear the keyboard.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const scrollToInput = () => {
      if (document.activeElement !== textareaRef.current) return;
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    vv.addEventListener("resize", scrollToInput);
    return () => vv.removeEventListener("resize", scrollToInput);
  }, []);

  const handleFocus = () => {
    // Delay matches the keyboard slide-up animation (~300ms) so we scroll
    // after the viewport has finished shrinking.
    setTimeout(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  };

  const handleSubmit = () => {
    if (!hasText || submitted) return;
    setSubmitted(true);
    onAnswer(value.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const placeholder = config.placeholder || "Write here…";

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mt-2"
    >
      {config.prompt && (
        <p className="mb-2 font-serif text-sm text-muted-foreground">
          {config.prompt}
        </p>
      )}

      {/* Same DOM structure before and after submit — no branching.
          After submit the textarea is just disabled; mirror keeps showing the text. */}
      <div className="relative">
        {/* Mirror div: renders the styled text or placeholder */}
        <div
          ref={mirrorRef}
          aria-hidden="true"
          className="pointer-events-none min-h-6 whitespace-pre-wrap break-words font-serif text-base leading-relaxed"
          style={{ color: "var(--viewer-voice)" }}
        >
          {value ? (
            <span className="italic">{value}</span>
          ) : (
            <span className="not-italic text-muted-foreground/50">
              {placeholder}
            </span>
          )}
        </div>

        {/* Invisible textarea: captures all input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            if (!submitted) setValue(e.target.value.slice(0, maxLen));
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={submitted}
          rows={1}
          className="absolute inset-0 m-0 w-full resize-none border-none bg-transparent p-0 font-serif text-base leading-relaxed outline-none"
          style={{
            color: "transparent",
            caretColor: "var(--viewer-voice)",
            overflow: "hidden",
          }}
          aria-label={config.prompt || "Type your answer"}
        />
      </div>

      <motion.div
        animate={{ opacity: hasText && !submitted ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-center pt-3"
        style={{ pointerEvents: hasText && !submitted ? "auto" : "none" }}
      >
        <button
          onClick={handleSubmit}
          aria-label="Submit answer"
          className="group flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        >
          <motion.div
            animate={hasText && !submitted ? { y: [0, 6, 0] } : {}}
            transition={
              hasText && !submitted
                ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                : {}
            }
          >
            <ChevronDown className="h-6 w-6" />
          </motion.div>
        </button>
      </motion.div>
    </motion.div>
  );
}
