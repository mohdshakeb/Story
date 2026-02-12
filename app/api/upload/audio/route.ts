import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  MAX_AUDIO_SIZE,
  ACCEPTED_AUDIO_TYPES,
} from "@/lib/utils/constants";

/**
 * POST /api/upload/audio
 *
 * FormData fields:
 *   file     — the audio File
 *   storyId  — UUID of the story (determines storage path)
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

  if (!file || !storyId) {
    return NextResponse.json(
      { error: "Missing required fields: file, storyId" },
      { status: 400 }
    );
  }

  if (!ACCEPTED_AUDIO_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Use MP3, MP4, or M4A." },
      { status: 400 }
    );
  }

  if (file.size > MAX_AUDIO_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum 10MB." },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
  const filename = `audio-${Date.now()}.${ext}`;
  const path = `${storyId}/${filename}`;

  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from("story-audio")
    .upload(path, file, { contentType: file.type, upsert: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("story-audio").getPublicUrl(data.path);

  return NextResponse.json({ url: publicUrl, path: data.path });
}
