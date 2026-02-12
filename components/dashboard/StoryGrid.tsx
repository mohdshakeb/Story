import type { StoryWithCount } from "@/lib/types/story";
import { StoryCard } from "./StoryCard";

interface StoryGridProps {
  stories: StoryWithCount[];
}

export function StoryGrid({ stories }: StoryGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {stories.map((story) => (
        <StoryCard key={story.id} story={story} />
      ))}
    </div>
  );
}
