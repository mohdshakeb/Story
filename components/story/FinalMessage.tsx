"use client";

import { motion, type Variants } from "motion/react";
import type { Story } from "@/lib/types/story";
import { ImageWithFallback } from "./ImageWithFallback";

interface FinalMessageProps {
  story: Story;
}

// ─── Animation variants ───────────────────────────────────────────────────────
// `ease: "easeOut" as const` is required — TypeScript widens string literals in
// standalone object consts to `string`, which fails the `Easing` type check.
// `as const` preserves the literal so it matches the Easing union.

const container: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.28, delayChildren: 0.2 },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, ease: "easeOut" as const },
  },
};

const expandLine: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

const imageFade: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.9, ease: "easeOut" as const },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * The emotional climax of the recipient experience.
 * Rendered after all chapters are completed.
 *
 * Handles all four final_message_type values:
 *   "text"        → serif message text only
 *   "image"       → image only
 *   "combination" → text above image
 *   null/undefined → default "Thank you" fallback
 */
export function FinalMessage({ story }: FinalMessageProps) {
  const { final_message_type, final_message_content, final_message_media_url } =
    story;

  const showText =
    final_message_type === "text" || final_message_type === "combination";
  const showImage =
    (final_message_type === "image" || final_message_type === "combination") &&
    !!final_message_media_url;

  return (
    <motion.div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      <div className="w-full max-w-xs space-y-8">
        {/* ── "The end" label ─────────────────────────────────── */}
        <motion.p
          variants={fadeUp}
          className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground"
        >
          The end
        </motion.p>

        {/* ── Expanding divider ───────────────────────────────── */}
        <motion.div
          variants={expandLine}
          className="mx-auto h-px w-8 origin-center bg-primary/40"
        />

        {/* ── Text message ────────────────────────────────────── */}
        {showText && final_message_content && (
          <motion.p
            variants={fadeUp}
            className="font-serif text-xl leading-relaxed text-foreground"
          >
            {final_message_content}
          </motion.p>
        )}

        {/* ── Default fallback (no type configured) ───────────── */}
        {!final_message_type && (
          <motion.p
            variants={fadeUp}
            className="font-serif text-lg text-foreground"
          >
            Thank you for reading. 💛
          </motion.p>
        )}

        {/* ── Image ───────────────────────────────────────────── */}
        {showImage && (
          <motion.div
            variants={imageFade}
            className="overflow-hidden rounded-2xl shadow-lg"
          >
            <ImageWithFallback
              src={final_message_media_url!}
              alt="Final message"
              className="w-full object-cover"
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
