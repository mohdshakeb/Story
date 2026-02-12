import { z } from "zod";

// ─── Prompt Config Schemas ───────────────────────────────────────────────────

export const MultipleChoiceConfigSchema = z.object({
  question: z.string().default(""),
  options: z
    .array(z.string().min(1, "Option cannot be empty"))
    .min(2, "At least 2 options required")
    .max(4, "Maximum 4 options"),
  integration_template: z.string().default(""),
});

export const TextInputConfigSchema = z.object({
  prompt: z.string().default(""),
  placeholder: z.string().default(""),
  max_length: z.coerce.number().int().min(3).max(200).default(50),
  integration_template: z.string().default(""),
});

export const AudioPlaybackConfigSchema = z.object({
  button_text: z.string().default("Play to hear..."),
  audio_url: z.string().url("Valid audio URL required"),
});

export const ImageRevealConfigSchema = z.object({
  reveal_text: z.string().default("Tap to reveal..."),
  image_url: z.string().url("Valid image URL required"),
});

// ─── Story Schemas ───────────────────────────────────────────────────────────

export const CreateStorySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be under 100 characters"),
  occasion: z.string().optional(),
  recipient_name: z
    .string()
    .trim()
    .max(50, "Name must be under 50 characters")
    .optional(),
});

export const UpdateStorySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be under 100 characters")
    .optional(),
  occasion: z.string().optional(),
  recipient_name: z
    .string()
    .trim()
    .max(50, "Name must be under 50 characters")
    .nullable()
    .optional(),
  final_message_type: z
    .enum(["text", "image", "video", "combination"])
    .nullable()
    .optional(),
  final_message_content: z.string().nullable().optional(),
  final_message_media_url: z.string().url().nullable().optional(),
});

// ─── Chapter Schema ──────────────────────────────────────────────────────────

export const ChapterFormSchema = z
  .object({
    title: z.string().max(100).nullable().optional(),
    paragraph_text: z
      .string()
      .min(1, "Paragraph text is required")
      .max(2000, "Paragraph must be under 2000 characters"),
    image_url: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
    background_image_url: z
      .union([z.string().url(), z.literal(""), z.null()])
      .optional(),
    prompt_type: z.enum([
      "multiple_choice",
      "text_input",
      "audio_playback",
      "image_reveal",
      "none",
    ]),
    prompt_config: z.unknown().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.prompt_type === "multiple_choice") {
      const result = MultipleChoiceConfigSchema.safeParse(data.prompt_config);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue({
            ...issue,
            path: ["prompt_config", ...issue.path],
          });
        });
      }
    } else if (data.prompt_type === "text_input") {
      const result = TextInputConfigSchema.safeParse(data.prompt_config);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue({
            ...issue,
            path: ["prompt_config", ...issue.path],
          });
        });
      }
    } else if (data.prompt_type === "audio_playback") {
      const result = AudioPlaybackConfigSchema.safeParse(data.prompt_config);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue({
            ...issue,
            path: ["prompt_config", ...issue.path],
          });
        });
      }
    } else if (data.prompt_type === "image_reveal") {
      const result = ImageRevealConfigSchema.safeParse(data.prompt_config);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue({
            ...issue,
            path: ["prompt_config", ...issue.path],
          });
        });
      }
    }
    // prompt_type "none" requires no config validation
  });

export type ChapterFormData = z.infer<typeof ChapterFormSchema>;

// ─── Final Message Schema ────────────────────────────────────────────────────

export const FinalMessageSchema = z
  .object({
    final_message_type: z.enum(["text", "image", "video", "combination"]),
    final_message_content: z.string().nullable().optional(),
    final_message_media_url: z.string().url().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.final_message_type === "text" ||
      data.final_message_type === "combination"
    ) {
      if (!data.final_message_content?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Message text is required",
          path: ["final_message_content"],
        });
      }
    }
    if (
      data.final_message_type === "image" ||
      data.final_message_type === "video" ||
      data.final_message_type === "combination"
    ) {
      if (!data.final_message_media_url) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Media file is required",
          path: ["final_message_media_url"],
        });
      }
    }
  });

export type FinalMessageFormData = z.infer<typeof FinalMessageSchema>;
