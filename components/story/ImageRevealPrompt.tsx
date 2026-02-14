"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { ImageRevealConfig } from "@/lib/types/story";

interface ImageRevealPromptProps {
  config: ImageRevealConfig;
  onAnswer: (answer: string) => void;
}

/**
 * Tap-to-reveal prompt with pre-reserved height.
 * The image is preloaded on mount to determine aspect ratio,
 * so the container is correctly sized before reveal — no layout jump.
 */
export function ImageRevealPrompt({
  config,
  onAnswer,
}: ImageRevealPromptProps) {
  const [revealed, setRevealed] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);

  // Preload image to measure aspect ratio
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl"
      style={aspectRatio ? { aspectRatio } : { minHeight: "10rem" }}
    >
      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.button
            key="teaser"
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.4 }}
            onClick={handleReveal}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 px-6 text-center transition-colors hover:border-primary/50 hover:bg-primary/10 active:scale-[0.98]"
          >
            <span className="text-2xl">✨</span>
            <p className="font-serif text-base font-medium text-foreground">
              {config.reveal_text || "Tap to reveal…"}
            </p>
          </motion.button>
        ) : (
          <motion.div
            key="image"
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="h-full w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={config.image_url}
              alt="Revealed"
              className="h-full w-full rounded-2xl object-cover"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
