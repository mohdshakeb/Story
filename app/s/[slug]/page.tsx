import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoryBySlug } from "@/lib/data/queries";
import { StoryExperience } from "@/components/story/StoryExperience";

interface Props {
  params: Promise<{ slug: string }>;
}

// ─── Open Graph metadata ──────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);

  if (!story) {
    return {
      title: "Story not found",
      description: "This story link is invalid or the story is not yet published.",
    };
  }

  const title = story.recipient_name
    ? `A story for ${story.recipient_name}`
    : story.title;

  return {
    title,
    description: `An interactive story: ${story.title}`,
    openGraph: {
      title,
      description: `An interactive story: ${story.title}`,
      type: "website",
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StoryPage({ params }: Props) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);

  // getStoryBySlug already filters published=true, so null = not found or unpublished
  if (!story) {
    notFound();
  }

  return <StoryExperience story={story} />;
}
