import { ImageResponse } from "next/og";
import { getStoryBySlug } from "@/lib/data/queries";

export const alt = "OurStory";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Node.js runtime — supabase-js uses Node APIs
export const runtime = "nodejs";

interface Props {
  params: Promise<{ slug: string }>;
}

async function loadImageAsDataURL(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

export default async function OGImage({ params }: Props) {
  const { slug } = await params;
  const story = await getStoryBySlug(slug);

  if (!story) {
    // Fallback for invalid slugs
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        }}
      >
        <span style={{ fontSize: 48, color: "#ffffff", fontWeight: 700 }}>
          OurStory
        </span>
      </div>,
      { ...size }
    );
  }

  // ── Determine which image to use (priority order) ───────────────────────────
  const imageSourceUrl = story.og_image_url ?? story.final_message_media_url;
  const imageDataUrl = imageSourceUrl
    ? await loadImageAsDataURL(imageSourceUrl)
    : null;

  const title = story.recipient_name
    ? `A story for ${story.recipient_name}`
    : story.title;

  // ── With background image ────────────────────────────────────────────────────
  if (imageDataUrl) {
    return new ImageResponse(
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background image */}
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <img
          src={imageDataUrl}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Bottom gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.0) 100%)",
          }}
        />

        {/* Text content */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "48px 56px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.65)",
              letterSpacing: "0.04em",
            }}
          >
            OurStory
          </span>
        </div>
      </div>,
      { ...size }
    );
  }

  // ── Generated placeholder (no image) ────────────────────────────────────────
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        padding: "56px 64px",
        background:
          "linear-gradient(135deg, #7f1d1d 0%, #881337 40%, #4c0519 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circle top-right */}
      <div
        style={{
          position: "absolute",
          top: -160,
          right: -160,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 60,
          width: 280,
          height: 280,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.04)",
        }}
      />

      {/* Heart / brand mark */}
      <div
        style={{
          position: "absolute",
          top: 52,
          left: 64,
          fontSize: 36,
          color: "rgba(255,255,255,0.30)",
          letterSpacing: "0.1em",
        }}
      >
        OurStory
      </div>

      {/* Main title */}
      <span
        style={{
          fontSize: 68,
          fontWeight: 700,
          color: "#ffffff",
          lineHeight: 1.1,
          letterSpacing: "-0.02em",
          maxWidth: "80%",
        }}
      >
        {title}
      </span>

      {/* Subtitle */}
      <span
        style={{
          marginTop: 20,
          fontSize: 26,
          color: "rgba(255,255,255,0.60)",
          letterSpacing: "0.02em",
        }}
      >
        An interactive story experience
      </span>
    </div>,
    { ...size }
  );
}
