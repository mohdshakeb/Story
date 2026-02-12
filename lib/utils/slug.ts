import { nanoid } from "nanoid";

/**
 * Generate a URL-safe slug from a story title + random suffix.
 * Example: "Our Anniversary Story" → "our-anniversary-story-a3k9mzx"
 */
export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const suffix = nanoid(7);
  return `${base}-${suffix}`;
}
