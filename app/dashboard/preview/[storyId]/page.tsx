import { notFound } from "next/navigation";
import { getStory } from "@/lib/data/queries";
import { StoryExperience } from "@/components/story/StoryExperience";

interface Props {
  params: Promise<{ storyId: string }>;
}

/**
 * Renders the full interactive recipient experience within the dashboard preview shell.
 * Uses the same StoryExperience component as /s/[slug] so preview is pixel-perfect.
 */
export default async function PreviewPage({ params }: Props) {
  const { storyId } = await params;
  const story = await getStory(storyId);

  if (!story) {
    notFound();
  }

  return <StoryExperience story={story} />;
}
