import { notFound } from "next/navigation";
import { getStory } from "@/lib/data/queries";
import { StoryEditorHeader } from "@/components/dashboard/StoryEditorHeader";
import { ChapterList } from "@/components/dashboard/ChapterList";

interface Props {
  params: Promise<{ storyId: string }>;
}

export default async function StoryEditorPage({ params }: Props) {
  const { storyId } = await params;
  const story = await getStory(storyId);

  if (!story) {
    notFound();
  }

  const chapters = story.chapters ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <StoryEditorHeader story={story} chapters={chapters} />

      <section>
        <h2 className="mb-4 text-lg font-semibold">Chapters</h2>
        <ChapterList chapters={chapters} storyId={story.id} />
      </section>
    </div>
  );
}
