"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

type FormData = z.infer<typeof CreateStorySchema>;

export function CreateStoryForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(CreateStorySchema),
    defaultValues: {
      title: "",
      occasion: undefined,
      recipient_name: "",
    },
  });

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
          onValueChange={(value) => setValue("occasion", value)}
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
