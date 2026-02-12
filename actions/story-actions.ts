"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createStory as dbCreate,
  updateStory as dbUpdate,
  deleteStory as dbDelete,
  publishStory as dbPublish,
  unpublishStory as dbUnpublish,
} from "@/lib/data/storage";
import { getStory } from "@/lib/data/queries";
import {
  CreateStorySchema,
  UpdateStorySchema,
  FinalMessageSchema,
} from "@/lib/utils/validation";
import type { ActionResult } from "@/lib/types/actions";
import type { Story } from "@/lib/types/story";

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createStoryAction(
  input: z.infer<typeof CreateStorySchema>
): Promise<ActionResult<Story>> {
  const parsed = CreateStorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  try {
    const story = await dbCreate(parsed.data);
    revalidatePath("/dashboard");
    return { success: true, data: story };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create story",
    };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateStoryAction(
  id: string,
  input: z.infer<typeof UpdateStorySchema>
): Promise<ActionResult<Story>> {
  const parsed = UpdateStorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  try {
    const story = await dbUpdate(id, parsed.data);
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/story/${id}`);
    return { success: true, data: story };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update story",
    };
  }
}

// ─── Update Final Message ─────────────────────────────────────────────────────

export async function updateFinalMessageAction(
  storyId: string,
  input: z.infer<typeof FinalMessageSchema>
): Promise<ActionResult<Story>> {
  const parsed = FinalMessageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validation failed",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  try {
    const story = await dbUpdate(storyId, parsed.data);
    revalidatePath(`/dashboard/story/${storyId}`);
    return { success: true, data: story };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update final message",
    };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteStoryAction(
  id: string
): Promise<ActionResult<void>> {
  try {
    await dbDelete(id);
    revalidatePath("/dashboard");
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete story",
    };
  }
}

// ─── Publish ──────────────────────────────────────────────────────────────────

export async function publishStoryAction(
  id: string,
  title: string
): Promise<ActionResult<Story>> {
  // Server-side completeness check — mirrors the PublishDialog checklist
  const storyWithChapters = await getStory(id);
  if (!storyWithChapters) {
    return { success: false, error: "Story not found" };
  }

  const chapters = storyWithChapters.chapters ?? [];

  if (chapters.length === 0) {
    return { success: false, error: "Add at least one chapter before publishing" };
  }

  const missingParagraph = chapters.some((c) => !c.paragraph_text.trim());
  if (missingParagraph) {
    return { success: false, error: "All chapters must have paragraph text" };
  }

  if (!storyWithChapters.final_message_type) {
    return { success: false, error: "Configure a final message before publishing" };
  }

  try {
    const story = await dbPublish(id, title);
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/story/${id}`);
    return { success: true, data: story };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to publish story",
    };
  }
}

// ─── Unpublish ────────────────────────────────────────────────────────────────

export async function unpublishStoryAction(
  id: string
): Promise<ActionResult<Story>> {
  try {
    const story = await dbUnpublish(id);
    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/story/${id}`);
    return { success: true, data: story };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to unpublish story",
    };
  }
}
