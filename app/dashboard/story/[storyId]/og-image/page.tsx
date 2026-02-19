import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getStory } from "@/lib/data/queries";
import { OGImageEditor } from "@/components/dashboard/OGImageEditor";

interface Props {
  params: Promise<{ storyId: string }>;
}

export default async function OGImagePage({ params }: Props) {
  const { storyId } = await params;
  const story = await getStory(storyId);

  if (!story) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/story/${storyId}`}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Story
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl font-semibold">Link Preview Image</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The image shown when your story link is shared on social media or
            messaging apps.
          </p>
        </div>

        <Separator />
      </div>

      {/* ── Editor ────────────────────────────────────────────── */}
      <OGImageEditor story={story} />
    </div>
  );
}
