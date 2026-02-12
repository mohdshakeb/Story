"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  MessageSquare,
  ImageIcon,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MediaUploader } from "@/components/dashboard/MediaUploader";
import { updateFinalMessageAction } from "@/actions/story-actions";
import type { Story, FinalMessageType } from "@/lib/types/story";

// Video is excluded — no upload endpoint exists yet (on cut list for Phase 1)
type SupportedMessageType = Exclude<FinalMessageType, "video">;

interface TypeOption {
  value: SupportedMessageType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    value: "text",
    label: "Text Only",
    description: "A heartfelt written message",
    icon: MessageSquare,
  },
  {
    value: "image",
    label: "Image Only",
    description: "A special photo or moment",
    icon: ImageIcon,
  },
  {
    value: "combination",
    label: "Text + Image",
    description: "Words and an image together",
    icon: Layers,
  },
];

interface FinalMessageEditorProps {
  story: Story;
}

export function FinalMessageEditor({ story }: FinalMessageEditorProps) {
  const router = useRouter();

  // Initialise from saved story, falling back to "text"
  const initialType =
    (story.final_message_type as SupportedMessageType | null) ?? "text";

  const [selectedType, setSelectedType] =
    useState<SupportedMessageType>(initialType);
  const [messageContent, setMessageContent] = useState(
    story.final_message_content ?? ""
  );
  const [mediaUrl, setMediaUrl] = useState<string | null>(
    story.final_message_media_url ?? null
  );
  // Storage path for the currently saved media (used for replace/delete)
  const [mediaPath, setMediaPath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const needsText = selectedType === "text" || selectedType === "combination";
  const needsMedia =
    selectedType === "image" || selectedType === "combination";

  const canSave =
    (!needsText || messageContent.trim().length > 0) &&
    (!needsMedia || mediaUrl !== null);

  const isSaved =
    story.final_message_type === selectedType &&
    (needsText ? story.final_message_content === messageContent : true) &&
    (needsMedia ? story.final_message_media_url === mediaUrl : true);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateFinalMessageAction(story.id, {
      final_message_type: selectedType,
      final_message_content: needsText ? messageContent : null,
      final_message_media_url: needsMedia ? mediaUrl : null,
    });

    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success("Final message saved");
      router.refresh();
    }
    setIsSaving(false);
  };

  return (
    <div className="space-y-8">
      {/* ── Type Selector ─────────────────────────────────────── */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Message Type</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {TYPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedType(opt.value)}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border p-4 text-left transition-all",
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    isSelected ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <div>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-primary" : "text-foreground"
                    )}
                  >
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Text Content ──────────────────────────────────────── */}
      {needsText && (
        <div className="space-y-2">
          <Label htmlFor="message-content">Your Message</Label>
          <Textarea
            id="message-content"
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            placeholder="Write your final message… Make it something they'll remember."
            rows={6}
            className="resize-none"
          />
          <p className="text-right text-xs text-muted-foreground">
            {messageContent.length} characters
          </p>
        </div>
      )}

      {/* ── Media Upload ──────────────────────────────────────── */}
      {needsMedia && (
        <div className="space-y-2">
          <Label>Image</Label>
          <MediaUploader
            type="image"
            storyId={story.id}
            value={mediaUrl}
            storagePath={mediaPath}
            fileType="final"
            onUpload={(url, path) => {
              setMediaUrl(url);
              setMediaPath(path);
            }}
            onRemove={() => {
              setMediaUrl(null);
              setMediaPath(null);
            }}
          />
        </div>
      )}

      {/* ── Save ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3">
        {isSaved && story.final_message_type && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Saved
          </span>
        )}
        <Button onClick={handleSave} disabled={!canSave || isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Final Message
        </Button>
      </div>
    </div>
  );
}
