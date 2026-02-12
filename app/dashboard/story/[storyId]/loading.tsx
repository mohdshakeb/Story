import { Separator } from "@/components/ui/separator";

export default function StoryEditorLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header skeleton */}
      <div className="space-y-4">
        <div className="h-8 w-28 animate-pulse rounded bg-muted" />
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-64 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            <div className="h-9 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <Separator />
      </div>

      {/* Chapter list skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[72px] animate-pulse rounded-lg border bg-muted/50"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
