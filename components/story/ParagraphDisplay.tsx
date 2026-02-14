"use client";

import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface ParagraphDisplayProps {
  text: string;
  /** When provided, appends the text inline at the end of the last paragraph
   *  in italic + viewer-voice color. Used for MC-no-template answers. */
  inlineAppend?: { text: string };
}

/**
 * Renders the chapter paragraph with basic Markdown support.
 *
 * Inline append uses a CSS approach: the appended span is rendered as a
 * sibling after ReactMarkdown. When present, the last <p> is set to
 * `display: inline` via a parent selector so the span flows on the same line.
 */
export function ParagraphDisplay({ text, inlineAppend }: ParagraphDisplayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        "prose prose-sm max-w-none font-serif text-base leading-relaxed text-foreground [&_p]:mb-4 [&_p:last-child]:mb-0",
        inlineAppend && "[&_p:last-of-type]:inline [&_p:last-of-type]:mb-0"
      )}
    >
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed last:mb-0">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic opacity-90">{children}</em>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
      {inlineAppend && (
        <span
          className="ml-1 italic"
          style={{ color: "var(--viewer-voice)" }}
        >
          {inlineAppend.text}
        </span>
      )}
    </motion.div>
  );
}
