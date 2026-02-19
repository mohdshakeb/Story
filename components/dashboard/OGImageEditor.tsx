"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Image as ImageIcon, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MediaUploader } from "@/components/dashboard/MediaUploader";
import { updateStoryAction } from "@/actions/story-actions";
import type { Story } from "@/lib/types/story";

interface OGImageEditorProps {
  story: Story;
}

export function OGImageEditor({ story }: OGImageEditorProps) {
  const router = useRouter();

  const [ogImageUrl, setOgImageUrl] = useState<string | null>(
    story.og_image_url ?? null
  );
  const [ogImagePath, setOgImagePath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // What will actually be used for the OG image (reflects the priority chain)
  const effectiveSource = ogImageUrl
    ? "custom"
    : story.final_message_media_url
    ? "final-message"
    : "placeholder";

  const isSaved = story.og_image_url === ogImageUrl;

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateStoryAction(story.id, {
      og_image_url: ogImageUrl,
    });

    if (!result.success) {
      toast.error(result.error);
    } else {
      toast.success("Link preview image saved");
      router.refresh();
    }
    setIsSaving(false);
  };

  const handleRemove = () => {
    setOgImageUrl(null);
    setOgImagePath(null);
  };

  return (
    <div className="space-y-8">
      {/* ── Priority explanation ───────────────────────────────── */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-300">
              How the preview image is chosen
            </p>
            <ol className="list-decimal space-y-0.5 pl-4 text-blue-700 dark:text-blue-400">
              <li
                className={
                  effectiveSource === "custom" ? "font-semibold" : ""
                }
              >
                Custom image uploaded here{" "}
                {effectiveSource === "custom" && (
                  <span className="text-green-600 dark:text-green-400">
                    ← active
                  </span>
                )}
              </li>
              <li
                className={
                  effectiveSource === "final-message" ? "font-semibold" : ""
                }
              >
                Final message image{" "}
                {effectiveSource === "final-message" && (
                  <span className="text-green-600 dark:text-green-400">
                    ← active
                  </span>
                )}
              </li>
              <li
                className={
                  effectiveSource === "placeholder" ? "font-semibold" : ""
                }
              >
                Branded placeholder{" "}
                {effectiveSource === "placeholder" && (
                  <span className="text-green-600 dark:text-green-400">
                    ← active
                  </span>
                )}
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* ── Image Upload ───────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          Custom Preview Image{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <p className="text-xs text-muted-foreground">
          Best results: landscape image, 1200 × 630 px or similar 1.91:1 ratio.
        </p>
        <MediaUploader
          type="image"
          storyId={story.id}
          value={ogImageUrl}
          storagePath={ogImagePath}
          fileType="og"
          onUpload={(url, path) => {
            setOgImageUrl(url);
            setOgImagePath(path);
          }}
          onRemove={handleRemove}
        />
      </div>

      {/* ── Save ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3">
        {isSaved && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            Saved
          </span>
        )}
        <Button onClick={handleSave} disabled={isSaving || isSaved}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Preview Image
        </Button>
      </div>
    </div>
  );
}
