"use client";

import { motion } from "motion/react";
import type { Story } from "@/lib/types/story";

interface StoryLandingProps {
  story: Story;
  onBegin: () => void;
}

/**
 * The first screen the recipient sees. Staggered entrance animations reveal
 * the greeting, title, and "Begin" button in sequence.
 */
export function StoryLanding({ story, onBegin }: StoryLandingProps) {
  const chapterCount = story.chapters?.length ?? 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div
        className="flex max-w-xs flex-col items-center gap-6"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.18 } },
        }}
      >
        {/* Greeting */}
        {story.recipient_name && (
          <motion.p
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
            }}
            className="font-serif text-sm text-muted-foreground"
          >
            A story for {story.recipient_name}
          </motion.p>
        )}

        {/* Title */}
        <motion.h1
          variants={{
            hidden: { opacity: 0, y: 14 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
          }}
          className="font-serif text-4xl font-semibold leading-tight tracking-tight text-foreground"
        >
          {story.title}
        </motion.h1>

        {/* Occasion */}
        {story.occasion && (
          <motion.p
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 0.5 } },
            }}
            className="font-serif text-sm capitalize text-muted-foreground"
          >
            {story.occasion.replace("-", " ")}
          </motion.p>
        )}

        {/* Divider */}
        <motion.div
          variants={{
            hidden: { scaleX: 0, opacity: 0 },
            visible: {
              scaleX: 1,
              opacity: 1,
              transition: { duration: 0.5, ease: "easeOut" },
            },
          }}
          className="h-px w-12 origin-center bg-primary/30"
        />

        {/* Chapter count hint */}
        {chapterCount > 0 && (
          <motion.p
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 0.5 } },
            }}
            className="font-serif text-xs text-muted-foreground"
          >
            {chapterCount} chapter{chapterCount !== 1 ? "s" : ""}
          </motion.p>
        )}

        {/* Begin button */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
          }}
          className="w-full"
        >
          <button
            onClick={onBegin}
            className="w-full rounded-full bg-primary py-3.5 font-serif text-base font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg active:scale-[0.98]"
          >
            Begin
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
