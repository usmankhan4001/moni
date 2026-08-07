import type { PaymentWithOutsourcer } from "@/lib/data";
import { formatDate, formatPKR, formatUSD } from "@/lib/format";
import { monthLabel } from "@/lib/date";
import { PaymentRowActions } from "@/components/payments/PaymentRowActions";
import { PaymentVoucherDialog } from "@/components/payments/PaymentVoucherDialog";

function BreakdownCell({
  label,
  tone = "text-foreground",
  children,
}: {
  label: string;
  tone?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background/60 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
        {label}
      </p>
      <p className={`font-mono text-sm font-medium tabular-nums ${tone}`}>
        {children}
      </p>
    </div>
  );
}

export function PaymentCard({ payment }: { payment: PaymentWithOutsourcer }) {
  const name = payment.outsourcer_name ?? "Unknown outsourcer";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-display text-lg text-foreground">{name}</h3>
            <span
              className={`text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full font-semibold ${
                payment.status === "paid"
                  ? "bg-emerald-600/10 text-emerald-600"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {payment.status === "paid" ? "Paid" : "Pending"}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {monthLabel(payment.month.slice(0, 7))}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Due {formatDate(payment.due_date, { dateStyle: "medium" })}
            {payment.status === "paid" && payment.paid_at
              ? ` · paid ${formatDate(payment.paid_at, { dateStyle: "medium" })}`
              : ""}
          </p>
        </div>

        <div className="text-right shrink-0">
          <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
            {formatPKR(payment.net_pkr)}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            Net PKR
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-px bg-border/70 rounded-sm overflow-hidden border border-border/70">
        <BreakdownCell label="Gross">{formatUSD(payment.gross_usd)}</BreakdownCell>
        <BreakdownCell label={`Tax (${payment.tax_rate}%)`} tone="text-destructive">
          −{formatUSD(payment.tax_usd)}
        </BreakdownCell>
        <BreakdownCell
          label={`Transfer fee (${payment.transfer_fee_rate}%)`}
          tone="text-destructive"
        >
          −{formatUSD(payment.transfer_fee_usd)}
        </BreakdownCell>
        <BreakdownCell label="Net USD" tone="text-emerald-600">
          {formatUSD(payment.net_usd)}
        </BreakdownCell>
        <BreakdownCell label="Net PKR" tone="text-primary">
          {formatPKR(payment.net_pkr)}
        </BreakdownCell>
        <BreakdownCell label="Exchange rate">
          @ {payment.exchange_rate.toFixed(2)}
        </BreakdownCell>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
        <PaymentVoucherDialog payment={payment} />
        <PaymentRowActions id={payment.id} status={payment.status} name={name} />
      </div>
    </div>
  );
}
