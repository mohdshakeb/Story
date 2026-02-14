"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MediaUploader } from "./MediaUploader";
import type { PromptType } from "@/lib/types/story";

interface PromptConfigEditorProps {
  promptType: PromptType;
  storyId: string;
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, { message?: string }>;
}

export function PromptConfigEditor({
  promptType,
  storyId,
  config,
  onChange,
  errors,
}: PromptConfigEditorProps) {
  switch (promptType) {
    case "multiple_choice":
      return (
        <MultipleChoiceEditor
          config={config}
          onChange={onChange}
          errors={errors}
        />
      );
    case "text_input":
      return (
        <TextInputEditor
          config={config}
          onChange={onChange}
          errors={errors}
        />
      );
    case "audio_playback":
      return (
        <AudioPlaybackEditor
          storyId={storyId}
          config={config}
          onChange={onChange}
          errors={errors}
        />
      );
    case "image_reveal":
      return (
        <ImageRevealEditor
          storyId={storyId}
          config={config}
          onChange={onChange}
          errors={errors}
        />
      );
    case "none":
    default:
      return null;
  }
}

// ─── Shared props type ────────────────────────────────────────────────────────

interface SubEditorProps {
  config: Record<string, unknown>;
  onChange: (config: Record<string, unknown>) => void;
  errors?: Record<string, { message?: string }>;
}

// ─── Multiple Choice ──────────────────────────────────────────────────────────

function MultipleChoiceEditor({ config, onChange, errors }: SubEditorProps) {
  const question = (config.question as string) ?? "";
  const options = (config.options as string[]) ?? ["", ""];
  const integrationTemplate = (config.integration_template as string) ?? "";

  const updateField = (field: string, value: unknown) => {
    onChange({ ...config, [field]: value });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    updateField("options", newOptions);
  };

  const addOption = () => {
    if (options.length < 4) {
      updateField("options", [...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      updateField("options", options.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="mc-question">
          Question{" "}
          <span className="text-muted-foreground font-normal text-xs">(optional)</span>
        </Label>
        <Input
          id="mc-question"
          placeholder="What would you choose?"
          value={question}
          onChange={(e) => updateField("question", e.target.value)}
        />
        {errors?.question && (
          <p className="text-sm text-destructive">
            {errors.question.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>
          Options <span className="text-destructive">*</span>
          <span className="ml-1 text-xs text-muted-foreground">
            (2–4 options)
          </span>
        </Label>
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder={`Option ${index + 1}`}
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
              />
              {options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(index)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
          {errors?.options && (
            <p className="text-sm text-destructive">
              {errors.options.message}
            </p>
          )}
        </div>
        {options.length < 4 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOption}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Option
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="mc-integration">Integration Template</Label>
        <Textarea
          id="mc-integration"
          placeholder="You chose [choice], and that reminds me of..."
          value={integrationTemplate}
          onChange={(e) => updateField("integration_template", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Use <code className="rounded bg-muted px-1">[choice]</code> as a
          placeholder for the selected option.
        </p>
      </div>
    </div>
  );
}

// ─── Text Input ───────────────────────────────────────────────────────────────

function TextInputEditor({ config, onChange, errors }: SubEditorProps) {
  const prompt = (config.prompt as string) ?? "";
  const placeholder = (config.placeholder as string) ?? "";
  const maxLength = (config.max_length as number) ?? 50;
  const integrationTemplate = (config.integration_template as string) ?? "";

  const updateField = (field: string, value: unknown) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ti-prompt">
          Prompt{" "}
          <span className="text-muted-foreground font-normal text-xs">(optional)</span>
        </Label>
        <Input
          id="ti-prompt"
          placeholder="What's your favorite memory of us?"
          value={prompt}
          onChange={(e) => updateField("prompt", e.target.value)}
        />
        {errors?.prompt && (
          <p className="text-sm text-destructive">
            {errors.prompt.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ti-placeholder">Placeholder Text</Label>
        <Input
          id="ti-placeholder"
          placeholder="Type your answer here..."
          value={placeholder}
          onChange={(e) => updateField("placeholder", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ti-maxlength">Max Length</Label>
        <Input
          id="ti-maxlength"
          type="number"
          min={3}
          max={500}
          value={maxLength}
          onChange={(e) => updateField("max_length", parseInt(e.target.value, 10) || 50)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ti-integration">Integration Template</Label>
        <Textarea
          id="ti-integration"
          placeholder='You said "[response]", and that makes me think...'
          value={integrationTemplate}
          onChange={(e) => updateField("integration_template", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Use <code className="rounded bg-muted px-1">[response]</code> as a
          placeholder for the typed answer.
        </p>
      </div>
    </div>
  );
}

// ─── Audio Playback ───────────────────────────────────────────────────────────

function AudioPlaybackEditor({
  storyId,
  config,
  onChange,
  errors,
}: SubEditorProps & { storyId: string }) {
  const buttonText = (config.button_text as string) ?? "Play to hear...";
  const audioUrl = (config.audio_url as string) ?? "";

  const updateField = (field: string, value: unknown) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ap-button">Button Text</Label>
        <Input
          id="ap-button"
          placeholder="Play to hear..."
          value={buttonText}
          onChange={(e) => updateField("button_text", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>
          Audio File <span className="text-destructive">*</span>
        </Label>
        <MediaUploader
          type="audio"
          storyId={storyId}
          value={audioUrl || null}
          onUpload={(url) => updateField("audio_url", url)}
          onRemove={() => updateField("audio_url", "")}
        />
        {errors?.audio_url && (
          <p className="text-sm text-destructive">
            {errors.audio_url.message}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Image Reveal ─────────────────────────────────────────────────────────────

function ImageRevealEditor({
  storyId,
  config,
  onChange,
  errors,
}: SubEditorProps & { storyId: string }) {
  const revealText = (config.reveal_text as string) ?? "Tap to reveal...";
  const imageUrl = (config.image_url as string) ?? "";

  const updateField = (field: string, value: unknown) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ir-text">Reveal Text</Label>
        <Input
          id="ir-text"
          placeholder="Tap to reveal..."
          value={revealText}
          onChange={(e) => updateField("reveal_text", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>
          Reveal Image <span className="text-destructive">*</span>
        </Label>
        <MediaUploader
          type="image"
          storyId={storyId}
          value={imageUrl || null}
          fileType="prompt_reveal"
          onUpload={(url) => updateField("image_url", url)}
          onRemove={() => updateField("image_url", "")}
        />
        {errors?.image_url && (
          <p className="text-sm text-destructive">
            {errors.image_url.message}
          </p>
        )}
      </div>
    </div>
  );
}
