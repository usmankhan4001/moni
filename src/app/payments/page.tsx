import { PageShell } from "@/components/layout/PageShell";
import { SetupRequiredBanner } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { ConversionStamp } from "@/components/shared/ConversionStamp";
import { GeneratePaymentDialog } from "@/components/payments/GeneratePaymentDialog";
import { PaymentsEmptyState } from "@/components/payments/PaymentsEmptyState";
import { PaymentCard } from "@/components/payments/PaymentCard";
import { getPayments, getSettings, isReady } from "@/lib/data";
import type { PaymentWithOutsourcer } from "@/lib/data";
import { formatDate, formatPKR, formatUSD } from "@/lib/format";
import { monthLabel } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const configured = isReady();
  const [payments, settings] = await Promise.all([getPayments(), getSettings()]);

  if (!configured) {
    return (
      <PageShell eyebrow="Obligations" title="Payments">
        <SetupRequiredBanner />
      </PageShell>
    );
  }

  const pending = payments.filter((payment) => payment.status === "pending");
  const paid = payments.filter((payment) => payment.status === "paid");

  const totalPendingPkr = pending.reduce((sum, payment) => sum + payment.net_pkr, 0);
  const totalPendingUsd = pending.reduce((sum, payment) => sum + payment.gross_usd, 0);

  let nextDue: string | null = null;
  for (const payment of pending) {
    if (!nextDue || payment.due_date < nextDue) nextDue = payment.due_date;
  }

  const grouped = new Map<string, PaymentWithOutsourcer[]>();
  for (const payment of pending) {
    const monthKey = payment.month.slice(0, 7);
    const list = grouped.get(monthKey) ?? [];
    list.push(payment);
    grouped.set(monthKey, list);
  }
  const monthKeys = [...grouped.keys()].sort().reverse();

  if (payments.length === 0) {
    return (
      <PageShell eyebrow="Obligations" title="Payments">
        <PaymentsEmptyState
          exchangeRate={settings.exchange_rate}
          payPercentage={settings.pay_percentage}
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Obligations"
      title="Payments"
      actions={
        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <ConversionStamp
              usdAmount={totalPendingUsd}
              exchangeRate={settings.exchange_rate}
              size="sm"
              showLabel={false}
            />
          </div>
          <GeneratePaymentDialog
            exchangeRate={settings.exchange_rate}
            payPercentage={settings.pay_percentage}
          />
        </div>
      }
    >
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-primary text-primary-foreground p-6 rounded-sm">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/50 mb-2 font-medium">
            Total pending dues
          </p>
          <p className="font-mono text-3xl font-semibold tabular-nums text-primary leading-tight">
            {formatPKR(totalPendingPkr)}
          </p>
          <p className="text-xs text-primary-foreground/40 mt-2">
            {pending.length} pending payment{pending.length === 1 ? "" : "s"} · at
            Rs {settings.exchange_rate.toFixed(2)}/USD
          </p>
        </div>
        <StatCard
          label="Pending payments"
          value={String(pending.length)}
          sublabel="Awaiting settlement"
        />
        <StatCard
          label="Next due date"
          value={nextDue ? formatDate(nextDue, { dateStyle: "medium" }) : "—"}
          sublabel="Earliest pending payment"
        />
      </div>

      {/* Pending runs */}
      {pending.length === 0 ? (
        <div className="rounded-md border border-dashed border-muted-foreground/40 bg-card p-10 text-center">
          <p className="font-display text-xl text-foreground">No pending dues</p>
          <p className="mt-1 text-sm text-muted-foreground">
            All outsourcer payments are settled.
          </p>
        </div>
      ) : (
        monthKeys.map((monthKey) => {
          const rows = grouped.get(monthKey) ?? [];
          const monthGross = rows.reduce((sum, payment) => sum + payment.gross_usd, 0);
          return (
            <section key={monthKey} className="mb-8">
              <div className="flex items-baseline justify-between gap-4 mb-3">
                <h2 className="font-display text-xl text-foreground">
                  {monthLabel(monthKey)}
                </h2>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">
                  {rows.length} {rows.length === 1 ? "payment" : "payments"} ·{" "}
                  {formatUSD(monthGross)} gross
                </p>
              </div>
              <div className="stagger space-y-4">
                {rows.map((payment) => (
                  <PaymentCard key={payment.id} payment={payment} />
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* History */}
      {paid.length > 0 && (
        <>
          <h2 className="font-display text-xl text-foreground mt-10 mb-4">
            Payment history
          </h2>
          <div className="bg-card border border-border rounded-sm divide-y divide-border">
            {paid.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between gap-4 p-4 opacity-70"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {payment.outsourcer_name ?? "Unknown outsourcer"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {monthLabel(payment.month.slice(0, 7))} · paid{" "}
                    {payment.paid_at
                      ? formatDate(payment.paid_at, { dateStyle: "medium" })
                      : ""}
                  </p>
                </div>
                <p className="font-mono text-sm font-semibold tabular-nums text-emerald-600 shrink-0">
                  {formatPKR(payment.net_pkr)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </PageShell>
  );
}