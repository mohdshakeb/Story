"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ImageRevealConfig } from "@/lib/types/story";

interface ImageRevealPromptProps {
  config: ImageRevealConfig;
  onAnswer: (answer: string) => void;
}

/**
 * Tap-to-reveal prompt. The reveal_text is shown first as a teaser overlay.
 * When tapped, the image cross-fades in with an opacity animation.
 * onAnswer is called after the reveal so the story can continue.
 */
export function ImageRevealPrompt({
  config,
  onAnswer,
}: ImageRevealPromptProps) {
  const [revealed, setRevealed] = useState(false);

  const handleReveal = () => {
    if (revealed) return;
    setRevealed(true);
    setTimeout(() => onAnswer("revealed"), 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl"
    >
      <AnimatePresence mode="wait">
        {!revealed ? (
          /* ── Tap-to-reveal overlay ─────────────────────────── */
          <motion.button
            key="teaser"
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.4 }}
            onClick={handleReveal}
            className="flex min-h-40 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/10 active:scale-[0.98]"
          >
            <span className="text-2xl">✨</span>
            <p className="font-serif text-base font-medium text-foreground">
              {config.reveal_text || "Tap to reveal…"}
            </p>
          </motion.button>
        ) : (
          /* ── Revealed image ────────────────────────────────── */
          <motion.div
            key="image"
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={config.image_url}
              alt="Revealed"
              className="w-full rounded-2xl object-cover"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
