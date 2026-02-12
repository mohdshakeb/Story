// Phase 1: Single hardcoded user. Replace with auth in Phase 2.
export const HARDCODED_USER_ID = "00000000-0000-0000-0000-000000000001";

export const MAX_CHAPTERS = 10;

export const OCCASION_OPTIONS = [
  { value: "anniversary", label: "Anniversary" },
  { value: "birthday", label: "Birthday" },
  { value: "proposal", label: "Proposal" },
  { value: "just-because", label: "Just Because" },
  { value: "other", label: "Other" },
] as const;

export const PROMPT_TYPE_OPTIONS = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "text_input", label: "Text Input" },
  { value: "audio_playback", label: "Audio Playback" },
  { value: "image_reveal", label: "Image Reveal" },
  { value: "none", label: "None (Continue)" },
] as const;

// Media upload limits
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_AUDIO_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ACCEPTED_AUDIO_TYPES = ["audio/mpeg", "audio/mp4", "audio/m4a"];
