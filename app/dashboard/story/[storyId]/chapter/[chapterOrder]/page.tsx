import { notFound } from "next/navigation";
import { getChapterByOrder, getChapters } from "@/lib/data/queries";
import { ChapterEditorForm } from "@/components/dashboard/ChapterEditorForm";

interface Props {
  params: Promise<{ storyId: string; chapterOrder: string }>;
}

export default async function ChapterEditorPage({ params }: Props) {
  const { storyId, chapterOrder } = await params;
  const orderIndex = parseInt(chapterOrder, 10);

  if (isNaN(orderIndex)) {
    notFound();
  }

  const [chapter, allChapters] = await Promise.all([
    getChapterByOrder(storyId, orderIndex),
    getChapters(storyId),
  ]);

  if (!chapter) {
    notFound();
  }

  const chapterNumber =
    allChapters.findIndex((c) => c.id === chapter.id) + 1;

  return (
    <ChapterEditorForm
      chapter={chapter}
      storyId={storyId}
      chapterNumber={chapterNumber || 1}
      totalChapters={allChapters.length}
    />
  );
}
