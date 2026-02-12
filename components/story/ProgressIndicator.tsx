"use client";

import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  total: number;
  current: number; // 0-indexed
}

export function ProgressIndicator({ total, current }: ProgressIndicatorProps) {
  if (total <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 rounded-full transition-all duration-500",
            i === current
              ? "w-5 bg-primary"
              : i < current
                ? "w-1.5 bg-primary/50"
                : "w-1.5 bg-border"
          )}
        />
      ))}
    </div>
  );
}
