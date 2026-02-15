import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  MAX_AUDIO_SIZE,
  ACCEPTED_AUDIO_TYPES,
} from "@/lib/utils/constants";

/**
 * POST /api/upload/audio
 *
 * Accepts JSON metadata (no file body — avoids Vercel's 4.5MB limit).
 * Returns a Supabase signed upload URL; the client uploads the file
 * directly to Supabase via uploadToSignedUrl.
 *
 * JSON body fields:
 *   storyId     — UUID of the story (determines storage path)
 *   filename    — original filename (used for extension)
 *   contentType — MIME type of the file
 *   fileSize    — file size in bytes
 *
 * Returns: { signedUrl: string, token: string, path: string }
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get("x-upload-token");
  if (!token || token !== process.env.NEXT_PUBLIC_UPLOAD_SECRET_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    storyId?: string;
    filename?: string;
    contentType?: string;
    fileSize?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { storyId, filename, contentType, fileSize } = body;

  if (!storyId || !filename || !contentType) {
    return NextResponse.json(
      { error: "Missing required fields: storyId, filename, contentType" },
      { status: 400 }
    );
  }

  if (!ACCEPTED_AUDIO_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: "Invalid file type. Use MP3, MP4, or M4A." },
      { status: 400 }
    );
  }

  if (fileSize && fileSize > MAX_AUDIO_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum 25MB." },
      { status: 400 }
    );
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "mp3";
  const path = `${storyId}/audio-${Date.now()}.${ext}`;

  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from("story-audio")
    .createSignedUploadUrl(path);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path,
  });
}
