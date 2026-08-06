import { Suspense } from "react";
import { isReady, getDashboardData, getPayments, getSettings } from "@/lib/data";
import type { TransactionWithRelations } from "@/lib/data";
import { PageShell } from "@/components/PageShell";
import { SetupRequiredBanner, EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { ConversionStamp } from "@/components/ConversionStamp";
import { Skeleton } from "@/components/ui/skeleton";
import { formatUSD, formatPKR, pluralize } from "@/lib/format";
import { currentMonthKey, monthLabel } from "@/lib/date";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { IncomeDistributionChart } from "@/components/charts/IncomeDistributionChart";
import { OutsourcerPayoutChart } from "@/components/charts/OutsourcerPayoutChart";

export const dynamic = "force-dynamic";

const statusStyles = {
  active: "bg-green-ink/10 text-green-ink border border-green-ink/20",
  completed: "bg-amber/10 text-amber border border-amber/20",
  cancelled: "bg-slate/10 text-slate border border-slate/20",
} as const;

const typeConfig = {
  income: { icon: "↗", color: "text-green-ink", bg: "bg-green-ink/10", prefix: "+" },
  expense: { icon: "↘", color: "text-red-ink", bg: "bg-red-ink/10", prefix: "−" },
  fee: { icon: "—", color: "text-slate", bg: "bg-slate/10", prefix: "−" },
} as const;

function toUsd(amount: number, currency: "USD" | "PKR", exchangeRate: number): number {
  return currency === "USD" ? amount : amount / exchangeRate;
}

function ActivityRow({ txn }: { txn: TransactionWithRelations }) {
  const config = typeConfig[txn.type];
  const amount = txn.currency === "USD" ? formatUSD(txn.amount) : formatPKR(txn.amount);
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
        <p className="text-sm font-medium text-ink truncate">{txn.description}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[10px] text-slate-light">{date}</p>
          {meta && (
            <>
              <span className="text-ledger-dark">·</span>
              <p className="text-[10px] text-slate-light truncate">{meta}</p>
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
        <div key={i} className="bg-white border border-border/60 rounded-xl p-5 shadow-xs">
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
            : `${pluralize(pendingPayments.length, "payment")} to contractors`
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
      <div className="lg:col-span-2 bg-white border border-border/80 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg text-ink">Cash Flow Trend</h3>
            <p className="text-xs text-slate-light">Income vs Expenses over the last 6 months (USD)</p>
          </div>
        </div>
        <CashFlowChart data={cashFlowData} />
      </div>

      <div className="bg-white border border-border/80 rounded-xl p-5 shadow-xs">
        <div className="mb-4">
          <h3 className="font-display text-lg text-ink">Income by Account</h3>
          <p className="text-xs text-slate-light">Distribution across accounts</p>
        </div>
        <IncomeDistributionChart data={incomeDistData} />
      </div>

      {outsourcerPayoutData.length > 0 && (
        <div className="lg:col-span-3 bg-white border border-border/80 rounded-xl p-5 shadow-xs">
          <div className="mb-4">
            <h3 className="font-display text-lg text-ink">Pending Contractor Dues (PKR)</h3>
            <p className="text-xs text-slate-light">Outstanding monthly payouts per outsourcer</p>
          </div>
          <OutsourcerPayoutChart data={outsourcerPayoutData} />
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
    <div className="bg-white border border-border/80 rounded-xl divide-y divide-border/60 overflow-hidden shadow-xs">
      {projects.slice(0, 5).map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-black/5 transition-colors">
          <div className="min-w-0">
            <p className="font-display text-base text-ink truncate">{p.title}</p>
            <p className="text-xs text-slate-light mt-0.5">{p.outsourcer_name ?? "Unassigned"}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full font-semibold ${statusStyles[p.status]}`}
            >
              {p.status}
            </span>
            <span className="font-mono text-sm font-semibold text-ink tabular-nums">
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
    <div className="bg-white border border-border/80 rounded-xl divide-y divide-border/60 overflow-hidden shadow-xs">
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
    <div className="mt-6 bg-ink text-paper p-6 rounded-xl shadow-md border border-white/10">
      <p className="text-[10px] uppercase tracking-[0.2em] text-paper/50 mb-2 font-mono">
        Next Settlement Run
      </p>
      {pending.length > 0 ? (
        <>
          <p className="font-display text-2xl text-paper">
            {pending.length === 1 ? "One payout pending" : `${pending.length} payouts pending`}
          </p>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-baseline justify-between gap-4">
            <span className="text-xs text-paper/70">Total Due to Outsourcers</span>
            <span className="font-mono text-lg font-semibold text-amber tabular-nums">
              {formatPKR(totalPkr)}
            </span>
          </div>
        </>
      ) : (
        <p className="mt-2 text-xs text-paper/70 leading-relaxed">
          Nothing due right now. Generate monthly payment runs from the{" "}
          <a href="/payments" className="text-amber underline underline-offset-2">
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

      <Suspense fallback={<div className="h-64 bg-white rounded-xl animate-pulse mb-8" />}>
        <ChartsSection />
      </Suspense>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-ink">Recent Projects</h2>
            <a
              href="/projects"
              className="text-xs uppercase tracking-widest text-amber hover:text-amber-dark transition-colors font-semibold"
            >
              View all
            </a>
          </div>
          <Suspense fallback={<div className="h-32 bg-white rounded-xl animate-pulse" />}>
            <RecentProjectsSection />
          </Suspense>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-ink">Recent Ledger Activity</h2>
            <a
              href="/transactions"
              className="text-xs uppercase tracking-widest text-amber hover:text-amber-dark transition-colors font-semibold"
            >
              View all
            </a>
          </div>
          <Suspense fallback={<div className="h-32 bg-white rounded-xl animate-pulse" />}>
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
