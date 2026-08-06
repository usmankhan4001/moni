import { isReady, getProjects, getSettings, getOutsourcers } from "@/lib/data";
import { PageShell } from "@/components/PageShell";
import { SetupRequiredBanner } from "@/components/EmptyState";
import { ProjectForm } from "@/components/ProjectForm";
import { ProjectActions } from "@/components/ProjectActions";
import { ConversionStamp } from "@/components/ConversionStamp";
import { Badge } from "@/components/ui/badge";
import { formatUSD, formatPKR } from "@/lib/format";
import { calculateOutsourcerPayment } from "@/lib/payments";

export const dynamic = "force-dynamic";

const statusStyles = {
  active: "border-emerald-600/30 bg-emerald-600/10 text-emerald-600",
  completed: "border-primary/30 bg-primary/10 text-primary",
  cancelled: "border-border bg-muted text-muted-foreground",
} as const;

function statusLabel(status: "active" | "completed" | "cancelled"): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function ProjectsPage() {
  if (!isReady()) {
    return (
      <PageShell eyebrow="Manage" title="Projects">
        <SetupRequiredBanner />
      </PageShell>
    );
  }

  const [projects, settings, outsourcers] = await Promise.all([
    getProjects(),
    getSettings(),
    getOutsourcers(),
  ]);

  const activeCount = projects.filter((p) => p.status === "active").length;
  const activeValueUsd = projects
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + p.amount_usd, 0);

  return (
    <PageShell
      eyebrow="Manage"
      title="Projects"
      actions={
        projects.length > 0 ? <ProjectForm outsourcers={outsourcers} /> : undefined
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-border/50 p-5 rounded-sm">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
            Total projects
          </p>
          <p className="font-mono text-2xl font-semibold tabular-nums">{projects.length}</p>
        </div>
        <div className="bg-white border border-border/50 p-5 rounded-sm">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
            Active
          </p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-emerald-600">
            {activeCount}
          </p>
        </div>
        <div className="bg-white border border-border/50 p-5 rounded-sm">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
            Active value
          </p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-primary">
            {formatUSD(activeValueUsd, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <ProjectForm outsourcers={outsourcers} emptyState />
      ) : (
        <div className="stagger space-y-3">
          {projects.map((project) => {
            const calc = calculateOutsourcerPayment(project.amount_usd, {
              taxRate: settings.default_tax_rate,
              transferFeeRate: settings.default_transfer_fee_rate,
              exchangeRate: settings.exchange_rate,
              payPercentage: settings.pay_percentage,
            });

            return (
              <div
                key={project.id}
                className="bg-white border border-border/50 rounded-sm p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg text-foreground truncate">
                      {project.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {project.outsourcer_name ?? "Unassigned"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge className={statusStyles[project.status]}>
                      {statusLabel(project.status)}
                    </Badge>
                    <span className="font-mono text-xl font-semibold text-foreground tabular-nums">
                      {formatUSD(project.amount_usd, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <ProjectActions
                      projectId={project.id}
                      title={project.title}
                      status={project.status}
                    />
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between gap-4">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>
                      Net to outsourcer:{" "}
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        {formatPKR(calc.netPkr)}
                      </span>
                    </p>
                    <p>
                      After {settings.default_tax_rate}% tax &amp; {settings.default_transfer_fee_rate}%
                      fee · your share{" "}
                      <span className="font-mono font-medium text-primary tabular-nums">
                        {formatPKR(calc.payAmountPkr)}
                      </span>
                    </p>
                  </div>
                  <ConversionStamp
                    usdAmount={calc.netUsd}
                    exchangeRate={settings.exchange_rate}
                    size="sm"
                    showLabel={false}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

