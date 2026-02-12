"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  X,
  Loader2,
  ImageIcon,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteMediaAction } from "@/actions/media-actions";
import {
  MAX_IMAGE_SIZE,
  MAX_AUDIO_SIZE,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_AUDIO_TYPES,
} from "@/lib/utils/constants";

interface MediaUploaderProps {
  type: "image" | "audio";
  storyId: string;
  /** Current media URL (shows preview if set) */
  value: string | null;
  /** Storage path for deletion (e.g. "story-id/chapter-image-123.jpg") */
  storagePath?: string | null;
  /** Label for the upload area (e.g. "chapter", "prompt_reveal") — used for storage filename prefix */
  fileType?: string;
  onUpload: (url: string, path: string) => void;
  onRemove: () => void;
}

export function MediaUploader({
  type,
  storyId,
  value,
  storagePath,
  fileType,
  onUpload,
  onRemove,
}: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const isImage = type === "image";
  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_AUDIO_SIZE;
  const acceptedTypes = isImage ? ACCEPTED_IMAGE_TYPES : ACCEPTED_AUDIO_TYPES;
  const acceptString = acceptedTypes.join(",");
  const maxSizeLabel = isImage ? "5MB" : "25MB";
  const typeLabel = isImage ? "image" : "audio file";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected
    e.target.value = "";

    if (!acceptedTypes.includes(file.type)) {
      toast.error(`Invalid file type for ${typeLabel}.`);
      return;
    }

    if (file.size > maxSize) {
      toast.error(`File too large. Maximum ${maxSizeLabel}.`);
      return;
    }

    setIsUploading(true);

    // Delete existing file first if replacing
    if (storagePath) {
      const bucket = isImage ? "story-images" : "story-audio";
      await deleteMediaAction(bucket, storagePath);
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("storyId", storyId);
    if (fileType) formData.append("fileType", fileType);

    try {
      const endpoint = isImage ? "/api/upload/image" : "/api/upload/audio";
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
        headers: {
          "x-upload-token": process.env.NEXT_PUBLIC_UPLOAD_SECRET_TOKEN ?? "",
        },
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Upload failed");
        setIsUploading(false);
        return;
      }

      onUpload(data.url, data.path);
      toast.success(`${isImage ? "Image" : "Audio"} uploaded`);
    } catch {
      toast.error("Upload failed. Please try again.");
    }
    setIsUploading(false);
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    if (storagePath) {
      const bucket = isImage ? "story-images" : "story-audio";
      const result = await deleteMediaAction(bucket, storagePath);
      if (!result.success) {
        toast.error(result.error);
        setIsRemoving(false);
        return;
      }
    }
    onRemove();
    setIsRemoving(false);
  };

  if (value) {
    return (
      <div className="relative rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center gap-3">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="Uploaded"
              className="h-20 w-20 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-md bg-muted">
              <Headphones className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {!isImage && (
              <audio controls src={value} className="w-full max-w-xs" />
            )}
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                )}
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={isRemoving}
                className="text-destructive hover:text-destructive"
              >
                {isRemoving ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="mr-1.5 h-3.5 w-3.5" />
                )}
                Remove
              </Button>
            </div>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={acceptString}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        ) : isImage ? (
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        ) : (
          <Headphones className="h-8 w-8 text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">
            {isUploading ? "Uploading…" : `Click to upload ${typeLabel}`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isImage ? "JPEG, PNG, or WebP" : "MP3, MP4, or M4A"} — max{" "}
            {maxSizeLabel}
          </p>
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={acceptString}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
