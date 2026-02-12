"use client";

import { useState } from "react";
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
  Loader2,
  MessageSquarePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PublishDialog } from "./PublishDialog";
import { unpublishStoryAction } from "@/actions/story-actions";
import type { Story, Chapter } from "@/lib/types/story";

interface StoryEditorHeaderProps {
  story: Story;
  chapters: Chapter[];
}

export function StoryEditorHeader({ story, chapters }: StoryEditorHeaderProps) {
  const router = useRouter();
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

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
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="truncate text-2xl font-semibold">{story.title}</h1>
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
