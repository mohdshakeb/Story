import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";

interface Props {
  children: React.ReactNode;
  params: Promise<{ storyId: string }>;
}

/**
 * Preview layout — wraps children in the recipient theme class so the
 * creator sees the warm rose/cream palette and Lora serif font exactly
 * as the recipient will. The dashboard header stays visible (App Router
 * layouts compose, not replace), which conveniently signals "Preview Mode".
 */
export default async function PreviewLayout({ children, params }: Props) {
  const { storyId } = await params;

  return (
    <div className="theme-recipient -mx-4 -my-8 sm:-mx-6 lg:-mx-8">
      {/* ── Preview banner ──────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b bg-foreground/5 px-4 py-2 text-xs">
        <Link
          href={`/dashboard/story/${storyId}`}
          className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Editor
        </Link>
        <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
          <Eye className="h-3.5 w-3.5" />
          Preview Mode
        </div>
        {/* Spacer keeps the label centred */}
        <div className="w-24" />
      </div>

      {/* ── Content (recipient-themed) ──────────────────────────── */}
      <div className="bg-background">{children}</div>
    </div>
  );
}
