"use client";

import { motion } from "motion/react";

interface ViewerVoiceTextProps {
  /** The full text to display */
  text: string;
  /**
   * If provided, this substring within `text` is wrapped in <em>.
   * Used for MC + integration_template where only the [choice] is emphasized.
   * When omitted, the entire text renders italic.
   */
  highlightSubstring?: string;
}

/**
 * Displays the viewer's answer as inline prose in the viewer-voice color.
 * Replaces the old IntegrationText bordered-quote style with a clean paragraph.
 */
export function ViewerVoiceText({
  text,
  highlightSubstring,
}: ViewerVoiceTextProps) {
  const content = (() => {
    if (!highlightSubstring || !text.includes(highlightSubstring)) {
      return <em>{text}</em>;
    }
    const idx = text.indexOf(highlightSubstring);
    const before = text.slice(0, idx);
    const after = text.slice(idx + highlightSubstring.length);
    return (
      <>
        {before}
        <em>{highlightSubstring}</em>
        {after}
      </>
    );
  })();

  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-4 font-serif text-base leading-relaxed"
      style={{ color: "var(--viewer-voice)" }}
    >
      {content}
    </motion.p>
  );
}
