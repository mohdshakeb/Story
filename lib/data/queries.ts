/**
 * Read-only DB operations — called directly by Server Components.
 * Uses the service role client to bypass RLS in Phase 1.
 */
import { createServiceClient } from "@/lib/supabase/service";
import type { Story, StoryWithCount, StoryCompletion, Chapter } from "@/lib/types/story";

// ─── Story Queries ─────────────────────────────────────────────────────────

export async function getStories(userId: string): Promise<StoryWithCount[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("stories")
    .select("*, chapters(count), story_completions(id)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const { chapters, story_completions, ...story } = row as Story & {
      chapters: Array<{ count: number }>;
      story_completions: Array<{ id: string }>;
    };
    return {
      ...story,
      chapter_count: chapters?.[0]?.count ?? 0,
      is_completed: (story_completions?.length ?? 0) > 0,
    } as StoryWithCount;
  });
}

export async function getStory(id: string): Promise<Story | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("stories")
    .select("*, chapters(*)")
    .eq("id", id)
    .order("order_index", { referencedTable: "chapters", ascending: true })
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as Story;
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("stories")
    .select("*, chapters(*)")
    .eq("slug", slug)
    .eq("published", true)
    .order("order_index", { referencedTable: "chapters", ascending: true })
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as Story;
}

export async function slugExists(slug: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("stories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  return data !== null;
}

// ─── Completion Queries ──────────────────────────────────────────────────────

export async function getStoryCompletion(
  storyId: string
): Promise<StoryCompletion | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("story_completions")
    .select("*")
    .eq("story_id", storyId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as StoryCompletion | null;
}

export async function getStoryCompletionBySlug(
  slug: string
): Promise<StoryCompletion | null> {
  const supabase = createServiceClient();

  // Look up story_id from slug first, then fetch completion
  const { data: story } = await supabase
    .from("stories")
    .select("id")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!story) return null;

  const { data, error } = await supabase
    .from("story_completions")
    .select("*")
    .eq("story_id", story.id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as StoryCompletion | null;
}

// ─── Chapter Queries ────────────────────────────────────────────────────────

export async function getChapters(storyId: string): Promise<Chapter[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("story_id", storyId)
    .order("order_index", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Chapter[];
}

export async function getChapter(id: string): Promise<Chapter | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as Chapter;
}

export async function getChapterByOrder(
  storyId: string,
  orderIndex: number
): Promise<Chapter | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("story_id", storyId)
    .eq("order_index", orderIndex)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return data as Chapter;
}
