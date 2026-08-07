import { Skeleton } from "@/components/ui/skeleton";

/**
 * Lightweight, data-independent placeholder that mimics the PageShell layout
 * (sidebar + header + a few content blocks). Used by route-level loading.tsx
 * files so navigation renders something instantly instead of a blank page
 * while the real, data-fetching page streams in behind it.
 */
export function PageSkeleton({ title }: { title?: string }) {
  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-background">
      {/* Desktop sidebar placeholder */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col z-50 max-lg:hidden shadow-sm">
        <div className="px-6 py-8 border-b border-border">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-2 w-14" />
            </div>
          </div>
        </div>
        <div className="flex-1 py-6 space-y-2 px-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 lg:ml-64 w-full flex flex-col pt-16 lg:pt-0 pb-[80px] lg:pb-0">
        <header className="glass-header sticky top-0 z-40">
          <div className="px-5 lg:px-10 py-5 lg:py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <Skeleton className="h-3 w-20 mb-2" />
              {title ? (
                <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
                  {title}
                </h1>
              ) : (
                <Skeleton className="h-8 w-48" />
              )}
            </div>
          </div>
        </header>

        <div className="p-5 lg:p-10 flex-1 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border/60 rounded-xl p-5 shadow-xs">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-7 w-32" />
                <Skeleton className="mt-2 h-3 w-20" />
              </div>
            ))}
          </div>

          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>

          <div className="bg-card border border-border/80 rounded-xl divide-y divide-border/60 overflow-hidden shadow-xs">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-2.5 w-1/5" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
