"use server";

import { revalidatePath } from "next/cache";
import { deleteStorageFile } from "@/lib/data/storage";
import type { ActionResult } from "@/lib/types/actions";

/**
 * Delete a file from Supabase Storage.
 * Called when replacing or removing images/audio on a chapter or story.
 *
 * @param bucket - "story-images" | "story-audio" | "final-messages"
 * @param path   - The storage path (e.g. "story-id/chapter-image-123.jpg")
 * @param revalidateUrl - Optional Next.js path to revalidate after deletion
 */
export async function deleteMediaAction(
  bucket: string,
  path: string,
  revalidateUrl?: string
): Promise<ActionResult<void>> {
  try {
    await deleteStorageFile(bucket, path);
    if (revalidateUrl) revalidatePath(revalidateUrl);
    return { success: true, data: undefined };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to delete media file",
    };
  }
}
