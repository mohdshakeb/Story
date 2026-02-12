import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreateStoryForm } from "@/components/dashboard/CreateStoryForm";

export default function CreateStoryPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/dashboard">
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Stories
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create New Story</CardTitle>
          <CardDescription>
            Start a new interactive story. You can add chapters, prompts, and
            media after creating it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateStoryForm />
        </CardContent>
      </Card>
    </div>
  );
}
