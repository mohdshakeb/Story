import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  MAX_IMAGE_SIZE,
  ACCEPTED_IMAGE_TYPES,
} from "@/lib/utils/constants";

/**
 * POST /api/upload/image
 *
 * FormData fields:
 *   file     — the image File
 *   storyId  — UUID of the story (determines storage path)
 *   fileType — "chapter" | "background" | "prompt_reveal" | "final" (optional label)
 *
 * Returns: { url: string, path: string }
 */
export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const storyId = formData.get("storyId") as string | null;
  const fileType = (formData.get("fileType") as string | null) ?? "image";

  if (!file || !storyId) {
    return NextResponse.json(
      { error: "Missing required fields: file, storyId" },
      { status: 400 }
    );
  }

  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Use JPEG, PNG, or WebP." },
      { status: 400 }
    );
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum 5MB." },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${fileType}-${Date.now()}.${ext}`;
  const path = `${storyId}/${filename}`;

  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from("story-images")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("story-images").getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl, path: data.path });
}
