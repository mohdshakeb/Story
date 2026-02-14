"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CreateStorySchema } from "@/lib/utils/validation";
import { OCCASION_OPTIONS } from "@/lib/utils/constants";
import { createStoryAction } from "@/actions/story-actions";

// Explicit form type avoids Zod v4 input-type mismatch with RHF v5
type FormData = {
  title: string;
  occasion?: string;
  anniversary_number?: number;
  recipient_name?: string;
};

export function CreateStoryForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(CreateStorySchema) as any as Resolver<FormData>,
    defaultValues: {
      title: "",
      occasion: undefined,
      anniversary_number: undefined,
      recipient_name: "",
    },
  });

  const selectedOccasion = watch("occasion");

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    const result = await createStoryAction(data);

    if (!result.success) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    toast.success("Story created!");
    router.push(`/dashboard/story/${result.data.id}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Story Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          placeholder="Our Love Story"
          {...register("title")}
          aria-invalid={!!errors.title}
        />
        {errors.title && (
          <p className="text-sm text-destructive">{errors.title.message}</p>
        )}
      </div>

      {/* Recipient Name */}
      <div className="space-y-2">
        <Label htmlFor="recipient_name">Recipient Name</Label>
        <Input
          id="recipient_name"
          placeholder="e.g. Sarah"
          {...register("recipient_name")}
          aria-invalid={!!errors.recipient_name}
        />
        {errors.recipient_name && (
          <p className="text-sm text-destructive">
            {errors.recipient_name.message}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          The person this story is for. Used for personalization.
        </p>
      </div>

      {/* Occasion */}
      <div className="space-y-2">
        <Label htmlFor="occasion">Occasion</Label>
        <Select
          onValueChange={(value) => {
            setValue("occasion", value);
            if (value !== "anniversary") setValue("anniversary_number", undefined);
          }}
        >
          <SelectTrigger id="occasion">
            <SelectValue placeholder="Select an occasion" />
          </SelectTrigger>
          <SelectContent>
            {OCCASION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.occasion && (
          <p className="text-sm text-destructive">{errors.occasion.message}</p>
        )}
      </div>

      {/* Anniversary Number — only shown when occasion is "anniversary" */}
      {selectedOccasion === "anniversary" && (
        <div className="space-y-2">
          <Label htmlFor="anniversary_number">Which anniversary?</Label>
          <Input
            id="anniversary_number"
            type="number"
            min={1}
            max={200}
            placeholder="e.g. 5"
            {...register("anniversary_number", { valueAsNumber: true })}
            aria-invalid={!!errors.anniversary_number}
          />
          {errors.anniversary_number && (
            <p className="text-sm text-destructive">
              {errors.anniversary_number.message}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Shown as &ldquo;5th Anniversary&rdquo; on the story cover.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Story
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dashboard")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
