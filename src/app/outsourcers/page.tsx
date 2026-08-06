import type { Outsourcer } from "@/lib/data";
import { getOutsourcers, getProjects, getSettings } from "@/lib/data";
import { calculateOutsourcerPayment } from "@/lib/payments";
import { formatPKR, formatUSD, pluralize } from "@/lib/format";
import { PageShell } from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { OutsourcerForm } from "@/components/outsourcer-form";
import { DeleteOutsourcerButton } from "@/components/outsourcer-delete";

export const dynamic = "force-dynamic";

interface OutsourcerRow extends Outsourcer {
  completedCount: number;
  completedUsd: number;
  monthlyPayPkr: number | null;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function OutsourcersPage() {
  const [settings, outsourcers, projects] = await Promise.all([
    getSettings(),
    getOutsourcers(),
    getProjects(),
  ]);

  const rows: OutsourcerRow[] = outsourcers.map((o) => {
    const done = projects.filter(
      (p) => p.outsourcer_id === o.id && p.status === "completed",
    );
    const completedUsd = done.reduce((sum, p) => sum + p.amount_usd, 0);
    const monthlyPayPkr =
      completedUsd > 0
        ? calculateOutsourcerPayment(completedUsd, {
            taxRate: o.tax_rate,
            transferFeeRate: o.transfer_fee_rate,
            exchangeRate: settings.exchange_rate,
            payPercentage: settings.pay_percentage,
          }).payAmountPkr
        : null;
    return { ...o, completedCount: done.length, completedUsd, monthlyPayPkr };
  });

  const assigned = projects.filter((p) => p.outsourcer_id);
  const completedAssigned = assigned.filter((p) => p.status === "completed");

  return (
    <PageShell
      eyebrow="Team"
      title="Outsourcers"
      actions={<OutsourcerForm />}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <StatCard
          label="Active outsourcers"
          value={String(outsourcers.length)}
          sublabel={pluralize(outsourcers.length, "on the roster")}
        />
        <StatCard
          label="Projects assigned"
          value={String(assigned.length)}
          sublabel={`${completedAssigned.length} completed`}
        />
        <StatCard
          label="Default rates"
          value={`${settings.default_tax_rate}% / ${settings.default_transfer_fee_rate}%`}
          sublabel="Tax / Transfer fee"
          accent="amber"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No outsourcers yet"
          description="Add the people you pay each month along with their default tax and transfer fee rates."
        />
      ) : (
        <div className="stagger space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="bg-white border border-border/50 rounded-sm p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center font-mono text-sm font-semibold text-foreground">
                    {initials(row.name)}
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-foreground">{row.name}</h3>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">
                      Tax {row.tax_rate}% · Transfer {row.transfer_fee_rate}%
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-mono text-xl font-semibold text-foreground tabular-nums">
                    {row.completedUsd > 0 ? formatUSD(row.completedUsd) : "—"}
                  </p>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
                    {pluralize(row.completedCount, "completed project")}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Monthly would-pay:{" "}
                  {row.monthlyPayPkr !== null ? (
                    <span className="font-mono font-medium text-primary tabular-nums">
                      {formatPKR(row.monthlyPayPkr)}
                    </span>
                  ) : (
                    <span className="font-mono text-foreground">—</span>
                  )}
                  <span className="ml-1">
                    · {settings.pay_percentage}% of net
                  </span>
                </p>
                <div className="flex items-center gap-1">
                  <OutsourcerForm
                    outsourcer={{
                      id: row.id,
                      name: row.name,
                      taxRate: row.tax_rate,
                      transferFeeRate: row.transfer_fee_rate,
                    }}
                  />
                  <DeleteOutsourcerButton id={row.id} name={row.name} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}