"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  Globe,
  GlobeLock,
  Image as ImageIcon,
  Loader2,
  MessageSquarePlus,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { PublishDialog } from "./PublishDialog";
import { unpublishStoryAction, updateStoryAction } from "@/actions/story-actions";
import type { Story, Chapter } from "@/lib/types/story";

interface StoryEditorHeaderProps {
  story: Story;
  chapters: Chapter[];
}

export function StoryEditorHeader({ story, chapters }: StoryEditorHeaderProps) {
  const router = useRouter();
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(story.title);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleStartEdit = () => {
    setIsEditingTitle(true);
    setEditedTitle(story.title);
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditedTitle(story.title);
  };

  const handleSaveTitle = async () => {
    const trimmed = editedTitle.trim();

    // Validation
    if (!trimmed) {
      toast.error("Title cannot be empty");
      return;
    }
    if (trimmed.length > 100) {
      toast.error("Title must be under 100 characters");
      return;
    }
    if (trimmed === story.title) {
      setIsEditingTitle(false);
      return;
    }

    setIsSavingTitle(true);
    const result = await updateStoryAction(story.id, { title: trimmed });

    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success("Title updated");
      setIsEditingTitle(false);
      router.refresh();
    }
    setIsSavingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTitle();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleUnpublish = async () => {
    setIsUnpublishing(true);
    const result = await unpublishStoryAction(story.id);
    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success("Story unpublished");
      router.refresh();
    }
    setIsUnpublishing(false);
  };

  const handleCopyLink = () => {
    if (!story.slug) return;
    const url = `${window.location.origin}/s/${story.slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  return (
    <>
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            All Stories
          </Link>
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              {isEditingTitle ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    ref={inputRef}
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isSavingTitle}
                    className="text-2xl font-semibold h-auto py-1 max-w-lg"
                    maxLength={100}
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveTitle}
                    disabled={isSavingTitle}
                  >
                    {isSavingTitle ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    disabled={isSavingTitle}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={handleStartEdit}
                  className="group flex items-center gap-2 rounded px-1 -mx-1 hover:bg-accent transition-colors"
                >
                  <h1 className="truncate text-2xl font-semibold">{story.title}</h1>
                  <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              )}
              <Badge
                variant={story.published ? "default" : "secondary"}
                className="shrink-0 gap-1"
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
            </div>
            {story.recipient_name && (
              <p className="mt-1 text-sm text-muted-foreground">
                For {story.recipient_name}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/story/${story.id}/final-message`}>
                <MessageSquarePlus className="mr-1.5 h-4 w-4" />
                Final Message
              </Link>
            </Button>

            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/story/${story.id}/og-image`}>
                <ImageIcon className="mr-1.5 h-4 w-4" />
                Link Preview
              </Link>
            </Button>

            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/preview/${story.id}`}>
                <Eye className="mr-1.5 h-4 w-4" />
                Preview
              </Link>
            </Button>

            {story.published ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCopyLink}>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copy Link
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleUnpublish}
                  disabled={isUnpublishing}
                >
                  {isUnpublishing ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <GlobeLock className="mr-1.5 h-4 w-4" />
                  )}
                  Unpublish
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => setShowPublishDialog(true)}
              >
                <Globe className="mr-1.5 h-4 w-4" />
                Publish
              </Button>
            )}
          </div>
        </div>

        <Separator />
      </div>

      <PublishDialog
        story={story}
        chapters={chapters}
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
      />
    </>
  );
}
