import Link from "next/link";
import { BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-background p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <BookOpen className="h-7 w-7 text-primary" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No stories yet</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Create your first interactive story experience to share with someone
        special.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard/create">
          <Plus className="mr-1.5 h-4 w-4" />
          Create Your First Story
        </Link>
      </Button>
    </div>
  );
}
