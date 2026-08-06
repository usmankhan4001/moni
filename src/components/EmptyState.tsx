import { Button } from "@/components/ui/button";
import { SeedButton } from "@/components/SeedButton";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="border border-dashed border-muted-foreground/40 rounded-md bg-card p-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted text-xl">
        ✦
      </div>
      <h3 className="font-display text-xl text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function SetupRequiredBanner() {
  return (
    <div className="border border-amber/40 bg-amber/10 rounded-md p-6">
      <h2 className="font-display text-xl text-foreground">Connect your database</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Hisaab needs Supabase credentials before it can store anything. Add
        <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          NEXT_PUBLIC_SUPABASE_URL
        </code>
        and
        <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </code>
        to your environment, then apply{" "}
        <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">db/schema.sql</code>.
      </p>
      <div className="mt-4">
        <EmptyState
          title="Ready when you are"
          description="Once connected, you can load a small starter set of data to explore."
        />
        <div className="mt-3">
          <SeedButton label="Load demo data" />
        </div>
      </div>
    </div>
  );
}