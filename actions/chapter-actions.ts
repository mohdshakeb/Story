"use server";

import { revalidatePath } from "next/cache";
import {
  createChapter as dbCreate,
  updateChapter as dbUpdate,
  deleteChapter as dbDelete,
} from "@/lib/data/storage";
import { ChapterFormSchema } from "@/lib/utils/validation";
import type { ActionResult } from "@/lib/types/actions";
import type { Chapter, PromptConfig } from "@/lib/types/story";
import { z } from "zod";

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createChapterAction(
  storyId: string,
  orderIndex: number
): Promise<ActionResult<Chapter>> {
  try {
    const chapter = await dbCreate({
      story_id: storyId,
      order_index: orderIndex,
      prompt_type: "none",
    });
    revalidatePath(`/dashboard/story/${storyId}`);
    return { success: true, data: chapter };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create chapter",
    };
  }
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateChapterAction(
  id: string,
  storyId: string,
  input: z.infer<typeof ChapterFormSchema>
): Promise<ActionResult<Chapter>> {
  const parsed = ChapterFormSchema.safeParse(input);
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
    const chapter = await dbUpdate(id, {
      title: parsed.data.title ?? null,
      paragraph_text: parsed.data.paragraph_text,
      image_url: parsed.data.image_url ?? null,
      background_image_url: parsed.data.background_image_url ?? null,
      prompt_type: parsed.data.prompt_type,
      prompt_config: (parsed.data.prompt_config ?? null) as PromptConfig,
      image_position: parsed.data.image_position ?? "before_prompt",
    });
    revalidatePath(`/dashboard/story/${storyId}`);
    revalidatePath(
      `/dashboard/story/${storyId}/chapter/${chapter.order_index}`
    );
    return { success: true, data: chapter };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to update chapter",
    };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteChapterAction(
  id: string,
  storyId: string
): Promise<ActionResult<void>> {
  try {
    await dbDelete(id);
    revalidatePath(`/dashboard/story/${storyId}`);
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete chapter",
    };
  }
}
