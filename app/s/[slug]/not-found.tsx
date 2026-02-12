import Link from "next/link";

/**
 * Warm, branded 404 for the recipient experience.
 * Rendered when getStoryBySlug returns null (story not found or unpublished).
 */
export default function StoryNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-serif text-sm text-muted-foreground">It seems this story</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold text-foreground">
        isn&apos;t ready yet.
      </h1>
      <p className="mt-4 max-w-xs font-serif text-sm leading-relaxed text-muted-foreground">
        The link may be invalid, or the story hasn&apos;t been shared with you
        yet. Check back soon.
      </p>
      <Link
        href="/"
        className="mt-8 font-serif text-sm text-primary underline-offset-4 hover:underline"
      >
        Return home
      </Link>
    </div>
  );
}
