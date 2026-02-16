"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

interface ChapterImageProps {
  url: string;
  alt?: string;
  delay?: number;
}

/**
 * The chapter's decorative image — distinct from ImageRevealPrompt.
 * Preloads the image to set aspect-ratio on the container,
 * preventing layout jump when the image fades in.
 */
export function ChapterImage({ url, alt = "Chapter image", delay = 0 }: ChapterImageProps) {
  const [aspectRatio, setAspectRatio] = useState<string | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(`${img.naturalWidth} / ${img.naturalHeight}`);
      }
    };
    img.src = url;
  }, [url]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: "easeOut", delay }}
      className="overflow-hidden rounded-2xl"
      style={aspectRatio ? { aspectRatio } : undefined}
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
