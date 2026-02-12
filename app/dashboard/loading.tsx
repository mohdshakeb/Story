import { Card } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-9 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-5 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="h-40 animate-pulse bg-muted" />
            <div className="p-4 space-y-3">
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
