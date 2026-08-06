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

export const dynamic = "force-dynamic";

const statusStyles = {
  active: "bg-green-ink/10 text-green-ink",
  completed: "bg-amber/10 text-amber",
  cancelled: "bg-slate/10 text-slate",
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
    <div className="flex items-center gap-4 px-4 py-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${config.bg}`}
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
        <div key={i} className="bg-white border border-border/60 rounded-lg p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-32" />
          <Skeleton className="mt-2 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="bg-white border border-border/60 rounded-lg p-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-6 w-40" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="mt-6 bg-ink p-6 rounded-sm">
      <Skeleton className="h-3 w-24 bg-paper/20" />
      <Skeleton className="mt-3 h-6 w-40 bg-paper/20" />
      <Skeleton className="mt-4 h-5 w-32 bg-paper/20" />
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
    0,
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
        label="Total balance"
        value={formatUSD(totalBalanceUsd, { maximumFractionDigits: 0 })}
        sublabel={pluralize(accounts.length, "account")}
      />
      <StatCard
        label="Monthly income"
        value={formatUSD(incomeUsd, { maximumFractionDigits: 0 })}
        sublabel="This month"
        accent="green"
      />
      <StatCard
        label="Monthly expenses"
        value={formatUSD(expenseUsd, { maximumFractionDigits: 0 })}
        sublabel="Including fees"
        accent="red"
      />
      <StatCard
        label="Pending payments"
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
    <div className="bg-white border border-ledger-dark/50 rounded-sm divide-y divide-ledger/50">
      {projects.slice(0, 5).map((p) => (
        <div key={p.id} className="flex items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="font-display text-base text-ink truncate">{p.title}</p>
            <p className="text-xs text-slate-light mt-0.5">{p.outsourcer_name ?? "Unassigned"}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm font-medium ${statusStyles[p.status]}`}
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
    <div className="bg-white border border-ledger-dark/50 rounded-sm divide-y divide-ledger/50">
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
    <div className="mt-6 bg-ink text-paper p-6 rounded-sm">
      <p className="text-[10px] uppercase tracking-[0.2em] text-paper/50 mb-2">
        Next payment
      </p>
      {pending.length > 0 ? (
        <>
          <p className="font-display text-2xl text-paper">
            {pending.length === 1 ? "One payment due" : `${pending.length} payments due`}
          </p>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-baseline justify-between gap-4">
            <span className="text-sm text-paper/70">Total to outsourcers</span>
            <span className="font-mono text-lg font-semibold text-amber tabular-nums">
              {formatPKR(totalPkr)}
            </span>
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-paper/70 leading-relaxed">
          Nothing due right now. Generate payments from the{" "}
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
      title="Dashboard"
      actions={
        <Suspense fallback={null}>
          <HeaderStamp />
        </Suspense>
      }
    >
      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection />
      </Suspense>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-ink">Recent projects</h2>
            <a
              href="/projects"
              className="text-xs uppercase tracking-widest text-amber hover:text-amber-dark transition-colors font-medium"
            >
              View all
            </a>
          </div>
          <Suspense fallback={<SectionSkeleton />}>
            <RecentProjectsSection />
          </Suspense>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl text-ink">Recent activity</h2>
            <a
              href="/transactions"
              className="text-xs uppercase tracking-widest text-amber hover:text-amber-dark transition-colors font-medium"
            >
              View all
            </a>
          </div>
          <Suspense fallback={<SectionSkeleton />}>
            <RecentActivitySection />
          </Suspense>
          <Suspense fallback={<PanelSkeleton />}>
            <NextPaymentSection />
          </Suspense>
        </div>
      </div>
    </PageShell>
  );
}
