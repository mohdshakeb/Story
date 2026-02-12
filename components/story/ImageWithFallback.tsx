"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Image with a graceful broken-image fallback state.
 * Used for chapter images and final message media where the URL
 * might become stale (e.g. storage file deleted).
 */
export function ImageWithFallback({
  src,
  alt,
  className,
}: ImageWithFallbackProps) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        className={`flex min-h-40 items-center justify-center rounded-2xl bg-muted ${className ?? ""}`}
      >
        <ImageOff className="h-8 w-8 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
    />
  );
}
