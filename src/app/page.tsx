import { Suspense } from "react";
import { isReady, getDashboardData, getPayments, getSettings } from "@/lib/data";
import type { TransactionWithRelations } from "@/lib/data";
import { PageShell } from "@/components/layout/PageShell";
import { SetupRequiredBanner, EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { ConversionStamp } from "@/components/shared/ConversionStamp";
import { Skeleton } from "@/components/ui/skeleton";
import { formatUSD, formatPKR, pluralize } from "@/lib/format";
import { currentMonthKey, monthLabel } from "@/lib/date";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { IncomeDistributionChart } from "@/components/charts/IncomeDistributionChart";
import { OutsourcerPayoutChart } from "@/components/charts/OutsourcerPayoutChart";
import { ClientOnly } from "@/components/shared/ClientOnly";

export const dynamic = "force-dynamic";

const statusStyles = {
  active: "bg-emerald-600/10 text-emerald-600 border border-emerald-600/20",
  completed: "bg-primary/10 text-primary border border-primary/20",
  cancelled: "bg-muted/10 text-muted-foreground border border-border/20",
} as const;

const typeConfig = {
  income: { icon: "↗", color: "text-emerald-600", bg: "bg-emerald-600/10", prefix: "+" },
  expense: { icon: "↘", color: "text-destructive", bg: "bg-destructive/10", prefix: "−" },
  fee: { icon: "—", color: "text-muted-foreground", bg: "bg-muted/10", prefix: "−" },
} as const;

function toUsd(amount: number, currency: "USD" | "PKR", exchangeRate: number): number {
  return currency === "USD" ? amount : amount / exchangeRate;
}

function ActivityRow({ txn }: { txn: TransactionWithRelations }) {
  const config = typeConfig[txn.type];
  const amount = txn.currency === "USD" ? formatUSD(Math.abs(txn.amount)) : formatPKR(Math.abs(txn.amount));
  const meta = txn.account_name ?? txn.project_title;
  const date = new Date(txn.transaction_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-black/5 transition-colors">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${config.bg}`}
      >
        <span className={config.color}>{config.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{txn.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] text-muted-foreground">{date}</p>
          {meta && (
            <>
              <span className="text-border">·</span>
              <p className="text-[10px] text-muted-foreground truncate">{meta}</p>
            </>
          )}
        </div>
      </div>
      <p className={`font-mono text-sm font-medium tabular-nums shrink-0 ${config.color}`}>
        {config.prefix}
        {amount}
      </p>
    </div>
  );
}

async function HeaderStamp() {
  const [payments, settings] = await Promise.all([getPayments(), getSettings()]);
  const pendingUsd = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.gross_usd, 0);
  return (
    <ConversionStamp usdAmount={pendingUsd} exchangeRate={settings.exchange_rate} size="sm" />
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="bg-card border border-border/60 rounded-xl p-5 shadow-xs">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-32" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

async function StatsSection() {
  const [data, payments] = await Promise.all([getDashboardData(), getPayments()]);
  const { accounts, transactions, settings } = data;
  const monthKey = currentMonthKey();
  const rate = settings.exchange_rate;

  const pendingPayments = payments.filter((p) => p.status === "pending");
  const pendingPkr = pendingPayments.reduce((sum, p) => sum + p.net_pkr, 0);

  const totalBalanceUsd = accounts.reduce(
    (sum, a) => sum + toUsd(a.balance, a.currency, rate),
    0
  );
  const monthTxns = transactions.filter((t) => t.transaction_date.slice(0, 7) === monthKey);
  const incomeUsd = monthTxns
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + toUsd(t.amount, t.currency, rate), 0);
  const expenseUsd = monthTxns
    .filter((t) => t.type === "expense" || t.type === "fee")
    .reduce((sum, t) => sum + toUsd(t.amount, t.currency, rate), 0);

  return (
    <div className="stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        label="Total Balance"
        value={formatUSD(totalBalanceUsd, { maximumFractionDigits: 0 })}
        sublabel={pluralize(accounts.length, "account")}
      />
      <StatCard
        label="Monthly Income"
        value={formatUSD(incomeUsd, { maximumFractionDigits: 0 })}
        sublabel="This month"
        accent="green"
      />
      <StatCard
        label="Monthly Expenses"
        value={formatUSD(expenseUsd, { maximumFractionDigits: 0 })}
        sublabel="Including fees"
        accent="red"
      />
      <StatCard
        label="Pending Outsourcer Dues"
        value={formatPKR(pendingPkr)}
        sublabel={
          pendingPayments.length === 0
            ? "Nothing due"
            : `${pluralize(pendingPayments.length, "payment")} to outsourcers`
        }
        accent="amber"
      />
    </div>
  );
}

async function ChartsSection() {
  const data = await getDashboardData();
  const { transactions, accounts, settings } = data;
  const payments = await getPayments();

  // 1. Group cash flow by last 6 months
  const monthlyMap = new Map<string, { income: number; expenses: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("en-US", { month: "short" });
    monthlyMap.set(key, { income: 0, expenses: 0 });
    void label;
  }

  for (const t of transactions) {
    const key = t.transaction_date.slice(0, 7);
    if (monthlyMap.has(key)) {
      const entry = monthlyMap.get(key)!;
      const usdVal = toUsd(t.amount, t.currency, settings.exchange_rate);
      if (t.type === "income") entry.income += usdVal;
      else entry.expenses += usdVal;
    }
  }

  const cashFlowData = Array.from(monthlyMap.entries()).map(([key, val]) => {
    const d = new Date(`${key}-01`);
    return {
      month: d.toLocaleDateString("en-US", { month: "short" }),
      income: Math.round(val.income),
      expenses: Math.round(val.expenses),
      net: Math.round(val.income - val.expenses),
    };
  });

  // 2. Income distribution by account
  const accountMap = new Map<string, number>();
  for (const a of accounts) {
    accountMap.set(a.name, 0);
  }
  for (const t of transactions) {
    if (t.type === "income" && t.account_name) {
      const current = accountMap.get(t.account_name) ?? 0;
      accountMap.set(
        t.account_name,
        current + toUsd(t.amount, t.currency, settings.exchange_rate)
      );
    }
  }
  const incomeDistData = Array.from(accountMap.entries())
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .filter((d) => d.value > 0);

  // 3. Outsourcer Payouts
  const pending = payments.filter((p) => p.status === "pending");
  const payoutMap = new Map<string, number>();
  for (const p of pending) {
    const name = p.outsourcer_name ?? "Unassigned";
    payoutMap.set(name, (payoutMap.get(name) ?? 0) + p.net_pkr);
  }
  const outsourcerPayoutData = Array.from(payoutMap.entries()).map(([name, payoutPkr]) => ({
    name,
    payoutPkr: Math.round(payoutPkr),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div className="lg:col-span-2 bg-card border border-border/80 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg text-foreground">Cash Flow Trend</h3>
            <p className="text-xs text-muted-foreground">Income vs Expenses over the last 6 months (USD)</p>
          </div>
        </div>
        <ClientOnly fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
          <CashFlowChart data={cashFlowData} />
        </ClientOnly>
      </div>

      <div className="bg-card border border-border/80 rounded-xl p-5 shadow-xs">
        <div className="mb-4">
          <h3 className="font-display text-lg text-foreground">Income by Account</h3>
          <p className="text-xs text-muted-foreground">Distribution across accounts</p>
        </div>
        <ClientOnly fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
          <IncomeDistributionChart data={incomeDistData} />
        </ClientOnly>
      </div>

      {outsourcerPayoutData.length > 0 && (
        <div className="lg:col-span-3 bg-card border border-border/80 rounded-xl p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="font-display text-lg text-foreground">Pending Outsourcer Dues (PKR)</h3>
            <p className="text-xs text-muted-foreground">Outstanding monthly payouts per outsourcer</p>
          </div>
          <ClientOnly fallback={<div className="h-64 animate-pulse bg-muted rounded-lg" />}>
            <OutsourcerPayoutChart data={outsourcerPayoutData} />
          </ClientOnly>
        </div>
      )}
    </div>
  );
}

async function RecentProjectsSection() {
  const { projects } = await getDashboardData();

  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects yet"
        description="Add a project from the Projects page to start tracking value."
      />
    );
  }

  return (
    <div className="bg-card border border-border/80 rounded-xl divide-y divide-border/60 overflow-hidden shadow-xs">
      {projects.slice(0, 5).map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-black/5 transition-colors">
          <div className="min-w-0">
            <p className="font-display text-base text-foreground truncate">{p.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{p.outsourcer_name ?? "Unassigned"}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full font-semibold ${statusStyles[p.status]}`}
            >
              {p.status}
            </span>
            <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
              {formatUSD(p.amount_usd, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

async function RecentActivitySection() {
  const { recent } = await getDashboardData();

  if (recent.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Transactions will appear here as you record them."
      />
    );
  }

  return (
    <div className="bg-card border border-border/80 rounded-xl divide-y divide-border/60 overflow-hidden shadow-xs">
      {recent.map((txn) => (
        <ActivityRow key={txn.id} txn={txn} />
      ))}
    </div>
  );
}

async function NextPaymentSection() {
  const payments = await getPayments();
  const pending = payments.filter((p) => p.status === "pending");
  const totalPkr = pending.reduce((sum, p) => sum + p.net_pkr, 0);

  return (
    <div className="mt-6 bg-primary text-primary-foreground p-6 rounded-xl shadow-md border border-white/10">
      <p className="text-[10px] uppercase tracking-[0.2em] text-primary-foreground/50 mb-2 font-mono">
        Next Settlement Run
      </p>
      {pending.length > 0 ? (
        <>
          <p className="font-display text-2xl text-primary-foreground">
            {pending.length === 1 ? "One payout pending" : `${pending.length} payouts pending`}
          </p>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-baseline justify-between gap-4">
            <span className="text-xs text-primary-foreground/70">Total Due to Outsourcers</span>
            <span className="font-mono text-lg font-semibold text-primary tabular-nums">
              {formatPKR(totalPkr)}
            </span>
          </div>
        </>
      ) : (
        <p className="mt-2 text-xs text-primary-foreground/70 leading-relaxed">
          Nothing due right now. Generate monthly payment runs from the{" "}
          <a href="/payments" className="text-primary underline underline-offset-2">
            Payments page
          </a>
          .
        </p>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const monthKey = currentMonthKey();

  if (!isReady()) {
    return (
      <PageShell eyebrow={monthLabel(monthKey)} title="Dashboard">
        <SetupRequiredBanner />
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow={monthLabel(monthKey)}
      title="Financial Dashboard"
      actions={
        <Suspense fallback={null}>
          <HeaderStamp />
        </Suspense>
      }
    >
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      <Suspense fallback={<div className="h-64 bg-card rounded-xl animate-pulse mb-8" />}>
        <ChartsSection />
      </Suspense>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-foreground">Recent Projects</h2>
            <a
              href="/projects"
              className="text-xs uppercase tracking-widest text-primary hover:text-primary transition-colors font-semibold"
            >
              View all
            </a>
          </div>
          <Suspense fallback={<div className="h-32 bg-card rounded-xl animate-pulse" />}>
            <RecentProjectsSection />
          </Suspense>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-foreground">Recent Ledger Activity</h2>
            <a
              href="/transactions"
              className="text-xs uppercase tracking-widest text-primary hover:text-primary transition-colors font-semibold"
            >
              View all
            </a>
          </div>
          <Suspense fallback={<div className="h-32 bg-card rounded-xl animate-pulse" />}>
            <RecentActivitySection />
          </Suspense>
          <Suspense fallback={null}>
            <NextPaymentSection />
          </Suspense>
        </div>
      </div>
    </PageShell>
  );
}
