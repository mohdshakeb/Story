/**
 * Write DB operations — called only by Server Actions, never by components directly.
 * Uses the service role client to bypass RLS in Phase 1.
 */
import { createServiceClient } from "@/lib/supabase/service";
import type {
  Story,
  Chapter,
  CreateStoryInput,
  UpdateStoryInput,
  CreateChapterInput,
  UpdateChapterInput,
} from "@/lib/types/story";
import { HARDCODED_USER_ID } from "@/lib/utils/constants";
import { generateSlug } from "@/lib/utils/slug";
import { slugExists } from "./queries";

// ─── Story Operations ─────────────────────────────────────────────────────────

export async function createStory(input: CreateStoryInput): Promise<Story> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("stories")
    .insert({
      user_id: HARDCODED_USER_ID,
      title: input.title,
      occasion: input.occasion ?? null,
      recipient_name: input.recipient_name ?? null,
      published: false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Story;
}

export async function updateStory(
  id: string,
  input: UpdateStoryInput
): Promise<Story> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("stories")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Story;
}

export async function deleteStory(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("stories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function publishStory(id: string, title: string): Promise<Story> {
  // Generate a unique slug with collision detection
  let slug = generateSlug(title);
  let attempts = 0;
  while ((await slugExists(slug)) && attempts < 5) {
    slug = generateSlug(title);
    attempts++;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("stories")
    .update({ published: true, slug })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Story;
}

export async function unpublishStory(id: string): Promise<Story> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("stories")
    .update({ published: false })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Story;
}

// ─── Chapter Operations ───────────────────────────────────────────────────────

export async function createChapter(
  input: CreateChapterInput
): Promise<Chapter> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("chapters")
    .insert({
      story_id: input.story_id,
      order_index: input.order_index,
      title: input.title ?? null,
      paragraph_text: input.paragraph_text ?? "",
      prompt_type: input.prompt_type ?? "none",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Chapter;
}

export async function updateChapter(
  id: string,
  input: UpdateChapterInput
): Promise<Chapter> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("chapters")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Chapter;
}

export async function deleteChapter(id: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("chapters").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Media Storage Operations ─────────────────────────────────────────────────

export async function deleteStorageFile(
  bucket: string,
  path: string
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(error.message);
}
