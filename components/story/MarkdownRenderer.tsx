"use client";

import ReactMarkdown from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Centralised react-markdown wrapper with consistent prose styling.
 * Used by ParagraphDisplay and any other recipient-side text rendering.
 */
export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  // react-markdown v10 removed className from the component — use a wrapper div.
  return (
    <div className={className}>
      <ReactMarkdown
        components={{
          p: ({ children }) => (
            <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic opacity-90">{children}</em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
