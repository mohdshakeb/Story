import Link from "next/link";
import { BookX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StoryNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-24 text-center">
      <BookX className="h-12 w-12 text-muted-foreground/60" />
      <h2 className="mt-4 text-xl font-semibold">Story Not Found</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This story doesn&apos;t exist or may have been deleted.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
