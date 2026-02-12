"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChapterListItem } from "./ChapterListItem";
import { createChapterAction } from "@/actions/chapter-actions";
import { MAX_CHAPTERS } from "@/lib/utils/constants";
import type { Chapter } from "@/lib/types/story";

interface ChapterListProps {
  chapters: Chapter[];
  storyId: string;
}

export function ChapterList({ chapters, storyId }: ChapterListProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);

  const canAddMore = chapters.length < MAX_CHAPTERS;

  const handleAddChapter = async () => {
    if (!canAddMore) return;

    setIsAdding(true);
    const nextOrder = chapters.length > 0
      ? Math.max(...chapters.map((c) => c.order_index)) + 1
      : 0;

    const result = await createChapterAction(storyId, nextOrder);
    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success("Chapter added");
      router.push(
        `/dashboard/story/${storyId}/chapter/${result.data.order_index}`
      );
    }
    setIsAdding(false);
  };

  return (
    <div className="space-y-3">
      {chapters.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No chapters yet. Add your first chapter to start building the story.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {chapters.map((chapter, index) => (
            <ChapterListItem
              key={chapter.id}
              chapter={chapter}
              storyId={storyId}
              chapterNumber={index + 1}
            />
          ))}
        </div>
      )}

      <Button
        variant="outline"
        className="w-full"
        onClick={handleAddChapter}
        disabled={isAdding || !canAddMore}
      >
        {isAdding ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Plus className="mr-2 h-4 w-4" />
        )}
        {canAddMore
          ? `Add Chapter (${chapters.length}/${MAX_CHAPTERS})`
          : `Maximum ${MAX_CHAPTERS} chapters reached`}
      </Button>
    </div>
  );
}
