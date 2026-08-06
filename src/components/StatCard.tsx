interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  accent?: "default" | "amber" | "red" | "green";
}

export function StatCard({ label, value, sublabel, accent = "default" }: StatCardProps) {
  const accentColors = {
    default: "text-ink",
    amber: "text-amber",
    red: "text-red-ink",
    green: "text-green-ink",
  };

  return (
    <div className="bg-white border border-ledger-dark/50 p-5 rounded-sm">
      <p className="text-[10px] uppercase tracking-[0.15em] text-slate-light mb-2 font-medium">
        {label}
      </p>
      <p className={`font-mono text-2xl font-semibold tabular-nums ${accentColors[accent]}`}>
        {value}
      </p>
      {sublabel && (
        <p className="text-xs text-slate-light mt-1">{sublabel}</p>
      )}
    </div>
  );
}
