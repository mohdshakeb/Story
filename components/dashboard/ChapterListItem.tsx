"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  GripVertical,
  FileText,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { deleteChapterAction } from "@/actions/chapter-actions";
import type { Chapter } from "@/lib/types/story";

const PROMPT_TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  text_input: "Text Input",
  audio_playback: "Audio",
  image_reveal: "Image Reveal",
  none: "None",
};

interface ChapterListItemProps {
  chapter: Chapter;
  storyId: string;
  chapterNumber: number;
}

export function ChapterListItem({
  chapter,
  storyId,
  chapterNumber,
}: ChapterListItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasContent = chapter.paragraph_text.trim().length > 0;
  const preview = hasContent
    ? chapter.paragraph_text.slice(0, 80) + (chapter.paragraph_text.length > 80 ? "…" : "")
    : "No content yet";

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteChapterAction(chapter.id, storyId);
    if (!result.success) {
      toast.error(result.error);
      setIsDeleting(false);
    } else {
      toast.success(`Chapter ${chapterNumber} deleted`);
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Link
        href={`/dashboard/story/${storyId}/chapter/${chapter.order_index}`}
        className="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
      >
        <GripVertical className="h-5 w-5 shrink-0 text-muted-foreground/40" />

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
          {chapterNumber}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="truncate text-sm font-medium">
              {chapter.title || `Chapter ${chapterNumber}`}
            </h4>
            {chapter.prompt_type !== "none" && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                {PROMPT_TYPE_LABELS[chapter.prompt_type]}
              </Badge>
            )}
            {chapter.image_url && (
              <Badge variant="outline" className="shrink-0 text-xs">
                <FileText className="mr-1 h-3 w-3" />
                Image
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {preview}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className="opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            <span className="sr-only">Delete chapter</span>
          </Button>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </Link>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Chapter {chapterNumber}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chapter and its content. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
