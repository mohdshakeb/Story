"use client";

import { motion } from "motion/react";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ParagraphDisplayProps {
  text: string;
}

/**
 * Renders the chapter paragraph with basic Markdown support.
 * The motion wrapper fades in — re-mounts when `text` changes (keyed by parent).
 */
export function ParagraphDisplay({ text }: ParagraphDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="prose prose-sm max-w-none font-serif text-base leading-relaxed text-foreground [&_p]:mb-4 [&_p:last-child]:mb-0"
    >
      <MarkdownRenderer content={text} />
    </motion.div>
  );
}
