"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { ImageRevealConfig } from "@/lib/types/story";

interface ImageRevealPromptProps {
  config: ImageRevealConfig;
  onAnswer: (answer: string) => void;
  /** When true (restored/saved state), starts in flipped position with no animation */
  initialRevealed?: boolean;
}

/**
 * 3D card flip reveal. Front face = teaser, back face = image.
 * Both faces always in DOM (no AnimatePresence). The card rotates
 * via motion rotateY (0 → 180). Container height is pre-reserved
 * from the preloaded image aspect ratio.
 *
 * CSS 3D requires three cooperating properties on three elements:
 *   perspective — on outer wrapper (defines vanishing point)
 *   transformStyle: preserve-3d — on the rotating card (keeps children in 3D)
 *   backfaceVisibility: hidden — on each face (hides face when rotated past 90°)
 *
 * WebkitBackfaceVisibility is required for iOS Safari.
 */
export function ImageRevealPrompt({
  config,
  onAnswer,
  initialRevealed = false,
}: ImageRevealPromptProps) {
  const [revealed, setRevealed] = useState(initialRevealed);
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);

  // Preload image to measure aspect ratio — prevents layout jump on reveal
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
    // Outer: entrance opacity fade + aspect ratio reservation + perspective for 3D
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative overflow-hidden rounded-2xl"
      style={{
        ...(aspectRatio ? { aspectRatio } : { minHeight: "10rem" }),
        perspective: "1000px",
      }}
    >
      {/* Inner card: rotates around Y axis on tap */}
      <motion.div
        initial={{ rotateY: initialRevealed ? 180 : 0 }}
        animate={{ rotateY: revealed ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Front face: teaser button */}
        <button
          onClick={handleReveal}
          disabled={revealed}
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 px-6 text-center hover:border-primary/50 hover:bg-primary/10 active:scale-[0.98]"
        >
          <span className="text-2xl">✨</span>
          <p className="font-serif text-base font-medium text-foreground">
            {config.reveal_text || "Tap to reveal…"}
          </p>
        </button>

        {/* Back face: revealed image (starts face-down via rotateY(180deg)) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.image_url}
            alt="Revealed"
            className="h-full w-full rounded-2xl object-cover"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
