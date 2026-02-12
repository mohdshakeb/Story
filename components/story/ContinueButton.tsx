"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

interface ContinueButtonProps {
  onClick: () => void;
  label?: string;
}

/**
 * Animated continue button. Fades in from below after a short delay
 * so it doesn't compete with the paragraph/image entrance.
 */
export function ContinueButton({
  onClick,
  label = "Continue",
}: ContinueButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
    >
      <button
        onClick={onClick}
        className="group flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
      >
        {label}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </button>
    </motion.div>
  );
}
