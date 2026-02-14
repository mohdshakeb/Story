"use client";

import { forwardRef } from "react";
import type { Chapter } from "@/lib/types/story";

type AspectRatio = "9:16" | "1:1";

interface ExportChapterCardProps {
  chapter: Chapter;
  chapterIndex: number;
  answer: string | null;
  aspectRatio: AspectRatio;
  storyTitle: string;
}

const DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
};

// Recipient theme colors (inline — Tailwind classes don't work in html-to-image)
const COLORS = {
  background: "#FFFBF5",
  foreground: "#3E2723",
  muted: "#8D6E63",
  border: "#E8DDD0",
  primary: "#FB7185",
  accent: "#D4A054",
  viewerVoice: "#7A7068", // Subtle warm gray — the reader's voice
};

/** Returns integration text with answer substituted, or raw answer.
 *  text_input always returns raw answer (no template). */
function getRenderedIntegration(chapter: Chapter, answer: string): string {
  if (chapter.prompt_type === "text_input") return answer;
  if (chapter.prompt_type !== "multiple_choice") return answer;

  const cfg = chapter.prompt_config as { integration_template?: string } | null;
  const tmpl = cfg?.integration_template?.trim() ?? "";
  if (!tmpl) return answer;

  return tmpl.replace("[choice]", answer);
}

/**
 * Fixed-size card for image export. Uses inline styles exclusively
 * so html-to-image can capture it reliably without Tailwind/CSS.
 */
export const ExportChapterCard = forwardRef<
  HTMLDivElement,
  ExportChapterCardProps
>(function ExportChapterCard(
  { chapter, chapterIndex, answer, aspectRatio, storyTitle },
  ref
) {
  const { width, height } = DIMENSIONS[aspectRatio];
  const isCompact = aspectRatio === "1:1";
  const integration = answer
    ? getRenderedIntegration(chapter, answer)
    : null;

  return (
    <div
      ref={ref}
      style={{
        width,
        height,
        backgroundColor: COLORS.background,
        color: COLORS.foreground,
        fontFamily: "'Lora', Georgia, serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: isCompact ? 80 : 100,
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top: chapter label */}
      <div>
        <p
          style={{
            fontSize: isCompact ? 22 : 24,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: COLORS.muted,
            margin: 0,
            marginBottom: isCompact ? 28 : 40,
          }}
        >
          {chapter.title?.trim() || `Chapter ${chapterIndex + 1}`}
        </p>

        {/* Paragraph text */}
        <p
          style={{
            fontSize: isCompact ? 30 : 36,
            lineHeight: 1.6,
            margin: 0,
            marginBottom: integration ? (isCompact ? 24 : 32) : 0,
            display: "-webkit-box",
            WebkitLineClamp: isCompact ? 6 : 10,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {chapter.paragraph_text}
        </p>

        {/* Viewer's answer in viewer-voice styling */}
        {integration && (
          <p
            style={{
              fontSize: isCompact ? 26 : 30,
              lineHeight: 1.6,
              fontStyle: "italic",
              color: COLORS.viewerVoice,
              margin: 0,
              marginTop: isCompact ? 16 : 24,
              display: "-webkit-box",
              WebkitLineClamp: isCompact ? 3 : 5,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {integration}
          </p>
        )}
      </div>

      {/* Chapter image */}
      {chapter.image_url && (
        <div
          style={{
            borderRadius: 24,
            overflow: "hidden",
            marginTop: isCompact ? 24 : 40,
            maxHeight: isCompact ? 380 : 600,
            flexShrink: 0,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={chapter.image_url}
            alt=""
            crossOrigin="anonymous"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
      )}

      {/* Bottom: branding */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: isCompact ? 24 : 40,
          flexShrink: 0,
        }}
      >
        <p
          style={{
            fontSize: 18,
            color: COLORS.muted,
            margin: 0,
            opacity: 0.6,
          }}
        >
          {storyTitle}
        </p>
        <p
          style={{
            fontSize: 18,
            color: COLORS.muted,
            margin: 0,
            opacity: 0.4,
          }}
        >
          OurStory
        </p>
      </div>
    </div>
  );
});
