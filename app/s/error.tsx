"use client";

import { useEffect } from "react";
import { motion } from "motion/react";

/**
 * Recipient-experience error boundary.
 * Styled to match the warm recipient theme (inherits .theme-recipient from layout).
 */
export default function RecipientError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-xs space-y-6"
      >
        <p className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Something went wrong
        </p>
        <p className="font-serif text-base leading-relaxed text-foreground">
          We couldn&apos;t load this story. Please try again.
        </p>
        <button
          onClick={reset}
          className="font-serif text-sm text-primary underline-offset-4 hover:underline"
        >
          Try again
        </button>
      </motion.div>
    </div>
  );
}
