"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PromptTypeSelector } from "./PromptTypeSelector";
import { PromptConfigEditor } from "./PromptConfigEditor";
import { MediaUploader } from "./MediaUploader";
import { ChapterFormSchema, type ChapterFormData } from "@/lib/utils/validation";
import { updateChapterAction } from "@/actions/chapter-actions";
import type { Chapter, PromptType } from "@/lib/types/story";

const DEFAULT_CONFIGS: Record<PromptType, unknown> = {
  none: null,
  multiple_choice: {
    question: "",
    options: ["", ""],
    integration_template: "",
  },
  text_input: {
    prompt: "",
    placeholder: "",
    max_length: 50,
    integration_template: "",
  },
  audio_playback: {
    button_text: "Play to hear...",
    audio_url: "",
  },
  image_reveal: {
    reveal_text: "Tap to reveal...",
    image_url: "",
  },
};

interface ChapterEditorFormProps {
  chapter: Chapter;
  storyId: string;
  chapterNumber: number;
  totalChapters: number;
}

export function ChapterEditorForm({
  chapter,
  storyId,
  chapterNumber,
  totalChapters,
}: ChapterEditorFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const methods = useForm<ChapterFormData>({
    resolver: zodResolver(ChapterFormSchema),
    defaultValues: {
      title: chapter.title ?? "",
      paragraph_text: chapter.paragraph_text,
      image_url: chapter.image_url ?? "",
      background_image_url: chapter.background_image_url ?? "",
      prompt_type: chapter.prompt_type,
      prompt_config: chapter.prompt_config ?? DEFAULT_CONFIGS[chapter.prompt_type],
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = methods;

  const promptType = watch("prompt_type");
  const promptConfig = watch("prompt_config");

  // Warn before navigating away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
  const imageUrl = watch("image_url") as string | undefined;

  const handlePromptTypeChange = (newType: PromptType) => {
    setValue("prompt_type", newType, { shouldDirty: true });
    setValue("prompt_config", DEFAULT_CONFIGS[newType], { shouldDirty: true });
  };

  const onSubmit = async (data: ChapterFormData) => {
    setIsSaving(true);

    // Clean up config: set to null for "none" type
    const submitData = {
      ...data,
      title: data.title || null,
      image_url: data.image_url || null,
      background_image_url: data.background_image_url || null,
      prompt_config: data.prompt_type === "none" ? null : data.prompt_config,
    };

    const result = await updateChapterAction(chapter.id, storyId, submitData);

    if (!result.success) {
      toast.error(result.error);
      setIsSaving(false);
      return;
    }

    toast.success("Chapter saved");
    router.refresh();
    setIsSaving(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/story/${storyId}`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to Story
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Chapter {chapterNumber} of {totalChapters}
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Chapter Title + Paragraph */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chapter-title">Chapter Title</Label>
                <Input
                  id="chapter-title"
                  placeholder={`Chapter ${chapterNumber}`}
                  {...register("title")}
                />
                <p className="text-xs text-muted-foreground">
                  Optional. If empty, defaults to &ldquo;Chapter{" "}
                  {chapterNumber}&rdquo;.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paragraph-text">
                  Paragraph <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="paragraph-text"
                  placeholder="Write the chapter text that the recipient will read..."
                  className="min-h-[150px]"
                  {...register("paragraph_text")}
                />
                {errors.paragraph_text && (
                  <p className="text-sm text-destructive">
                    {errors.paragraph_text.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chapter Image */}
          <Card>
            <CardHeader>
              <CardTitle>Chapter Image</CardTitle>
            </CardHeader>
            <CardContent>
              <MediaUploader
                type="image"
                storyId={storyId}
                value={imageUrl || null}
                fileType="chapter"
                onUpload={(url) =>
                  setValue("image_url", url, { shouldDirty: true })
                }
                onRemove={() =>
                  setValue("image_url", "", { shouldDirty: true })
                }
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Shown after the prompt interaction. Revealed as a visual moment
                in the story flow.
              </p>
            </CardContent>
          </Card>

          {/* Prompt Section */}
          <Card>
            <CardHeader>
              <CardTitle>Interactive Prompt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Prompt Type</Label>
                <PromptTypeSelector
                  value={promptType}
                  onChange={handlePromptTypeChange}
                />
              </div>

              {promptType !== "none" && (
                <>
                  <Separator />
                  <PromptConfigEditor
                    promptType={promptType}
                    storyId={storyId}
                    config={(promptConfig as Record<string, unknown>) ?? {}}
                    onChange={(updated) =>
                      setValue("prompt_config", updated, { shouldDirty: true })
                    }
                    errors={
                      errors.prompt_config as
                        | Record<string, { message?: string }>
                        | undefined
                    }
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex items-center justify-between rounded-lg border bg-card p-4">
            <div className="text-sm text-muted-foreground">
              {isDirty ? (
                <span className="text-amber-600 font-medium">
                  Unsaved changes
                </span>
              ) : (
                "All changes saved"
              )}
            </div>
            <Button type="submit" disabled={isSaving || !isDirty}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Chapter
            </Button>
          </div>
        </form>
    </div>
  );
}
