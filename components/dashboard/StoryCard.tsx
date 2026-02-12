"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { deleteStoryAction } from "@/actions/story-actions";
import type { StoryWithCount } from "@/lib/types/story";

const OCCASION_LABELS: Record<string, string> = {
  anniversary: "Anniversary",
  birthday: "Birthday",
  proposal: "Proposal",
  "just-because": "Just Because",
  other: "Other",
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

interface StoryCardProps {
  story: StoryWithCount;
}

export function StoryCard({ story }: StoryCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEdit = () => router.push(`/dashboard/story/${story.id}`);
  const handlePreview = () => router.push(`/dashboard/preview/${story.id}`);

  const handleCopyLink = () => {
    if (!story.slug) return;
    const url = `${window.location.origin}/s/${story.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteStoryAction(story.id);
    if (!result.success) {
      toast.error(result.error);
      setIsDeleting(false);
    } else {
      toast.success(`"${story.title}" deleted`);
      // router.refresh() not needed — revalidatePath in the action handles it
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card className="group relative flex flex-col overflow-hidden transition-shadow hover:shadow-md">
        <CardContent className="flex flex-1 flex-col gap-4 p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold leading-tight">
                {story.title}
              </h3>
              {story.recipient_name && (
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  For {story.recipient_name}
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePreview}>
                  <Eye className="mr-2 h-4 w-4" /> Preview
                </DropdownMenuItem>
                {story.published && story.slug && (
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Copy className="mr-2 h-4 w-4" /> Copy link
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Status + occasion badges */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={story.published ? "default" : "secondary"}
              className="gap-1"
            >
              {story.published ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Published
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" /> Draft
                </>
              )}
            </Badge>
            {story.occasion && (
              <Badge variant="outline">
                {OCCASION_LABELS[story.occasion] ?? story.occasion}
              </Badge>
            )}
          </div>

          {/* Stats row */}
          <div className="mt-auto flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" />
              {story.chapter_count}{" "}
              {story.chapter_count === 1 ? "chapter" : "chapters"}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(story.created_at)}
            </span>
          </div>
        </CardContent>

        {/* Action footer */}
        <div className="flex gap-2 border-t bg-muted/30 px-5 py-3">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={handleEdit}
          >
            Edit Story
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handlePreview}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" /> Preview
          </Button>
          {story.published && story.slug && (
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={handleCopyLink}
              title="Copy shareable link"
            >
              <Copy className="h-3.5 w-3.5" />
              <span className="sr-only">Copy link</span>
            </Button>
          )}
        </div>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{story.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the story and all its chapters. This
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
              {isDeleting ? "Deleting…" : "Delete Story"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
