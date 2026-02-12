"use client";

import { motion } from "motion/react";

interface ChapterImageProps {
  url: string;
  alt?: string;
}

/**
 * The chapter's decorative image — distinct from ImageRevealPrompt.
 * Fades in with a subtle scale-up to feel cinematic.
 */
export function ChapterImage({ url, alt = "Chapter image" }: ChapterImageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="overflow-hidden rounded-2xl"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className="w-full object-cover"
      />
    </motion.div>
  );
}
