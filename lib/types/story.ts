// ─── Prompt Types ────────────────────────────────────────────────────────────

export type PromptType =
  | "multiple_choice"
  | "text_input"
  | "audio_playback"
  | "image_reveal"
  | "none";

export type FinalMessageType = "text" | "image" | "video" | "combination";

// ─── Prompt Config (Discriminated Union) ─────────────────────────────────────

export interface MultipleChoiceConfig {
  question: string;
  options: string[];
  integration_template: string;
}

export interface TextInputConfig {
  prompt: string;
  placeholder: string;
  max_length: number;
  integration_template: string;
}

export interface AudioPlaybackConfig {
  button_text: string;
  audio_url: string;
}

export interface ImageRevealConfig {
  reveal_text: string;
  image_url: string;
}

export type PromptConfig =
  | MultipleChoiceConfig
  | TextInputConfig
  | AudioPlaybackConfig
  | ImageRevealConfig
  | null;

// ─── Core Models ─────────────────────────────────────────────────────────────

export interface Story {
  id: string;
  user_id: string;
  title: string;
  slug: string | null;
  occasion: string | null;
  anniversary_number: number | null;
  recipient_name: string | null;
  final_message_type: FinalMessageType | null;
  final_message_content: string | null;
  final_message_media_url: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
  chapters?: Chapter[];
}

export interface Chapter {
  id: string;
  story_id: string;
  order_index: number;
  title: string | null;
  paragraph_text: string;
  image_url: string | null;
  background_image_url: string | null;
  prompt_type: PromptType;
  prompt_config: PromptConfig;
  image_position: "before_prompt" | "after_prompt";
  created_at: string;
  updated_at: string;
}

// ─── Input Types (for create/update operations) ──────────────────────────────

export interface CreateStoryInput {
  title: string;
  occasion?: string;
  anniversary_number?: number;
  recipient_name?: string;
}

export interface UpdateStoryInput {
  title?: string;
  occasion?: string | null;
  anniversary_number?: number | null;
  recipient_name?: string | null;
  final_message_type?: FinalMessageType | null;
  final_message_content?: string | null;
  final_message_media_url?: string | null;
}

export interface CreateChapterInput {
  story_id: string;
  order_index: number;
  title?: string;
  paragraph_text?: string;
  prompt_type?: PromptType;
}

export interface UpdateChapterInput {
  title?: string | null;
  paragraph_text?: string;
  image_url?: string | null;
  background_image_url?: string | null;
  prompt_type?: PromptType;
  prompt_config?: PromptConfig;
  image_position?: "before_prompt" | "after_prompt";
}

// ─── Derived / View Types ─────────────────────────────────────────────────────

/** Story with a precomputed chapter count — used for the dashboard list view. */
export interface StoryWithCount extends Omit<Story, "chapters"> {
  chapter_count: number;
  is_completed?: boolean;
}

// ─── Story Completion ────────────────────────────────────────────────────────

/** Recipient's saved completion — one per story, upserted on re-save. */
export interface StoryCompletion {
  id: string;
  story_id: string;
  answers: Record<string, string>;
  completed_at: string;
}
