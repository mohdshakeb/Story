import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoryGrid } from "@/components/dashboard/StoryGrid";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { getStories } from "@/lib/data/queries";
import { HARDCODED_USER_ID } from "@/lib/utils/constants";

export default async function DashboardPage() {
  const stories = await getStories(HARDCODED_USER_ID);

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Stories</h1>
          <p className="mt-1 text-muted-foreground">
            Create and manage your interactive stories
          </p>
        </div>
        {stories.length > 0 && (
          <Button asChild>
            <Link href="/dashboard/create">
              <Plus className="mr-1.5 h-4 w-4" />
              New Story
            </Link>
          </Button>
        )}
      </div>

      {stories.length === 0 ? (
        <EmptyState />
      ) : (
        <StoryGrid stories={stories} />
      )}
    </div>
  );
}
