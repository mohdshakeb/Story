"use client";

import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";

interface IntegrationTextProps {
  /** Template string containing [choice] or [response] placeholder */
  template: string;
  /** The user's answer to substitute in */
  answer: string;
  promptType: "multiple_choice" | "text_input";
}

/**
 * Weaves the recipient's answer into the integration_template paragraph,
 * replacing [choice] or [response] with what they typed/selected.
 * Fades in from below to feel like a continuation of the story.
 */
export function IntegrationText({
  template,
  answer,
  promptType,
}: IntegrationTextProps) {
  const placeholder = promptType === "multiple_choice" ? "[choice]" : "[response]";
  const rendered = template.replace(placeholder, answer);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
      className="border-l-2 border-primary/30 pl-4"
    >
      <div className="prose prose-sm max-w-none font-serif italic text-base leading-relaxed text-foreground/80 [&_p]:mb-3 [&_p:last-child]:mb-0">
        <ReactMarkdown>{rendered}</ReactMarkdown>
      </div>
    </motion.div>
  );
}
