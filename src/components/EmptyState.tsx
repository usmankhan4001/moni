import { Button } from "@/components/ui/button";

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
      <h2 className="font-display text-xl text-foreground">Connect PostgreSQL Database</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Moni needs a valid PostgreSQL database connection. Set
        <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          DATABASE_URL
        </code>
        in your environment variables, then run
        <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
          npx drizzle-kit push
        </code>
        to initialize the schema.
      </p>
    </div>
  );
}
