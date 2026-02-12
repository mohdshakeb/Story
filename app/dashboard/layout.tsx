import Link from "next/link";
import { BookHeart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BookHeart className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">OurStory</span>
          </Link>
          <Button asChild size="sm">
            <Link href="/dashboard/create">
              <Plus className="mr-1.5 h-4 w-4" />
              New Story
            </Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
