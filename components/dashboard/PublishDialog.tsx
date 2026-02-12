"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Copy,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { publishStoryAction } from "@/actions/story-actions";
import type { Story, Chapter } from "@/lib/types/story";

interface PublishDialogProps {
  story: Story;
  chapters: Chapter[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CheckItem {
  label: string;
  passed: boolean;
}

function getChecklist(story: Story, chapters: Chapter[]): CheckItem[] {
  return [
    {
      label: "At least one chapter",
      passed: chapters.length > 0,
    },
    {
      label: "All chapters have paragraph text",
      passed:
        chapters.length > 0 &&
        chapters.every((c) => c.paragraph_text.trim().length > 0),
    },
    {
      label: "Final message configured",
      passed: story.final_message_type !== null,
    },
  ];
}

export function PublishDialog({
  story,
  chapters,
  open,
  onOpenChange,
}: PublishDialogProps) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  const checklist = getChecklist(story, chapters);
  const allPassed = checklist.every((item) => item.passed);

  const handlePublish = async () => {
    setIsPublishing(true);
    const result = await publishStoryAction(story.id, story.title);

    if (!result.success) {
      toast.error(result.error);
      setIsPublishing(false);
      return;
    }

    setPublishedSlug(result.data.slug);
    toast.success("Story published!");
    router.refresh();
    setIsPublishing(false);
  };

  const handleCopyLink = () => {
    if (!publishedSlug) return;
    const url = `${window.location.origin}/s/${publishedSlug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setPublishedSlug(null);
    }
    onOpenChange(isOpen);
  };

  const shareUrl = publishedSlug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/s/${publishedSlug}`
    : "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {publishedSlug ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Story Published!
              </DialogTitle>
              <DialogDescription>
                Share this link with your recipient.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={shareUrl}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy link</span>
              </Button>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => handleClose(false)}>
                Close
              </Button>
              <Button asChild>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                  Open Story
                </a>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Publish Story</DialogTitle>
              <DialogDescription>
                Review the checklist below before publishing. Once published,
                anyone with the link can view your story.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  {item.passed ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                  )}
                  <span
                    className={
                      item.passed ? "text-foreground" : "text-muted-foreground"
                    }
                  >
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isPublishing}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePublish}
                disabled={!allPassed || isPublishing}
              >
                {isPublishing && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Publish Story
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
