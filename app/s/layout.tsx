"use client";

import { MotionConfig } from "motion/react";

/**
 * Recipient experience shell.
 * All /s/* pages inherit the warm rose/cream palette via .theme-recipient,
 * which overrides the same CSS custom properties used by shadcn/ui.
 *
 * MotionConfig reducedMotion="user" automatically respects the OS-level
 * "Reduce Motion" accessibility setting for every motion.* in this subtree.
 */
export default function RecipientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="theme-recipient">{children}</div>
    </MotionConfig>
  );
}
