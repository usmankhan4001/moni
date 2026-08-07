interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  accent?: "default" | "amber" | "red" | "green";
}

export function StatCard({ label, value, sublabel, accent = "default" }: StatCardProps) {
  const accentColors = {
    default: "text-foreground",
    amber: "text-primary",
    red: "text-destructive",
    green: "text-emerald-600",
  };

  return (
    <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 font-semibold">
        {label}
      </p>
      <p className={`font-display text-3xl font-bold tracking-tight tabular-nums ${accentColors[accent]}`}>
        {value}
      </p>
      {sublabel && (
        <p className="text-xs text-muted-foreground mt-2 font-medium bg-muted/50 inline-block px-2 py-0.5 rounded-full">{sublabel}</p>
      )}
    </div>
  );
}
