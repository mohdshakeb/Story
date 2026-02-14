"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Share2, X } from "lucide-react";
import { toPng } from "html-to-image";
import { ExportChapterCard } from "./ExportChapterCard";
import type { Chapter } from "@/lib/types/story";

type AspectRatio = "9:16" | "1:1";

interface StoryExportProps {
  chapters: Chapter[];
  answers: Record<string, string>;
  storyTitle: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Bottom sheet for exporting completed story chapters as images.
 * Renders hidden ExportChapterCards, captures them with html-to-image,
 * then offers share (Web Share API) or download.
 */
export function StoryExport({
  chapters,
  answers,
  storyTitle,
  open,
  onClose,
}: StoryExportProps) {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const canShare =
    typeof navigator !== "undefined" && !!navigator.share && !!navigator.canShare;

  const generateImages = useCallback(async (): Promise<Blob[]> => {
    const blobs: Blob[] = [];
    setProgress(0);

    for (let i = 0; i < chapters.length; i++) {
      const node = cardRefs.current[i];
      if (!node) continue;

      const dataUrl = await toPng(node, {
        pixelRatio: 1,
        cacheBust: true,
      });

      const res = await fetch(dataUrl);
      blobs.push(await res.blob());
      setProgress(Math.round(((i + 1) / chapters.length) * 100));
    }

    return blobs;
  }, [chapters]);

  const handleShare = useCallback(async () => {
    setIsGenerating(true);
    try {
      const blobs = await generateImages();
      const files = blobs.map(
        (blob, i) =>
          new File([blob], `chapter-${i + 1}.png`, { type: "image/png" })
      );

      if (canShare && navigator.canShare({ files })) {
        await navigator.share({ files, title: storyTitle });
      } else {
        // Fallback: download individually
        for (const file of files) {
          const url = URL.createObjectURL(file);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      // User cancelled share sheet — ignore
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Export failed:", err);
      }
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, [generateImages, canShare, storyTitle]);

  const handleDownload = useCallback(async () => {
    setIsGenerating(true);
    try {
      const blobs = await generateImages();
      for (let i = 0; i < blobs.length; i++) {
        const url = URL.createObjectURL(blobs[i]);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chapter-${i + 1}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, [generateImages]);

  return (
    <>
      {/* Hidden render container for html-to-image capture */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          pointerEvents: "none",
        }}
      >
        {chapters.map((chapter, idx) => (
          <ExportChapterCard
            key={chapter.id}
            ref={(el) => {
              cardRefs.current[idx] = el;
            }}
            chapter={chapter}
            chapterIndex={idx}
            answer={answers[chapter.id] ?? null}
            aspectRatio={aspectRatio}
            storyTitle={storyTitle}
          />
        ))}
      </div>

      {/* Bottom sheet overlay */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-50 bg-black/40"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-background px-6 pb-10 pt-4"
            >
              {/* Handle */}
              <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-border" />

              {/* Header */}
              <div className="mb-6 flex items-center justify-between">
                <h3 className="font-serif text-lg font-semibold">
                  Share Your Story
                </h3>
                <button
                  onClick={onClose}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Format toggle */}
              <div className="mb-6 flex gap-2">
                {(["9:16", "1:1"] as const).map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${
                      aspectRatio === ratio
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {ratio === "9:16" ? "Story (9:16)" : "Square (1:1)"}
                  </button>
                ))}
              </div>

              {/* Info */}
              <p className="mb-6 text-center text-sm text-muted-foreground">
                {chapters.length} chapter{chapters.length !== 1 ? "s" : ""} will
                be exported as images
              </p>

              {/* Progress bar */}
              {isGenerating && (
                <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                {canShare ? (
                  <button
                    onClick={handleShare}
                    disabled={isGenerating}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
                  >
                    <Share2 className="h-4 w-4" />
                    {isGenerating ? `Generating… ${progress}%` : "Share"}
                  </button>
                ) : (
                  <button
                    onClick={handleDownload}
                    disabled={isGenerating}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {isGenerating
                      ? `Generating… ${progress}%`
                      : "Download All"}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
