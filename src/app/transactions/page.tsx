import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState, SetupRequiredBanner } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { NewTransactionDialog } from "@/components/transactions/NewTransactionDialog";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import {
  getAccounts,
  getProjects,
  getTransactions,
  getTransactionTotals,
  isReady,
} from "@/lib/data";
import { formatUSD } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const configured = isReady();
  const params = await searchParams;
  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [transactions, projects, accounts, totals] = await Promise.all([
    getTransactions(null, { limit: PAGE_SIZE, offset }),
    getProjects(),
    getAccounts(),
    getTransactionTotals(),
  ]);

  if (!configured) {
    return (
      <PageShell eyebrow="Ledger" title="Transactions">
        <SetupRequiredBanner />
      </PageShell>
    );
  }

  const { income_usd: incomeUsd, expense_usd: expenseUsd, fee_usd: feeUsd } = totals;
  const rateNote = "Ledger-wide, all time";

  return (
    <PageShell
      eyebrow="Ledger"
      title="Transactions"
      actions={<NewTransactionDialog projects={projects} accounts={accounts} />}
    >
      {/* Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          label="Income (USD)"
          value={`+${formatUSD(incomeUsd, { minimumFractionDigits: 0 })}`}
          sublabel={rateNote}
          accent="green"
        />
        <StatCard
          label="Expenses (USD)"
          value={`−${formatUSD(expenseUsd, { minimumFractionDigits: 0 })}`}
          sublabel={rateNote}
          accent="red"
        />
        <StatCard
          label="Fees (USD)"
          value={`−${formatUSD(feeUsd, { minimumFractionDigits: 0 })}`}
          sublabel={rateNote}
        />
      </div>

      {/* Ledger */}
      {transactions.length === 0 ? (
        <EmptyState
          title={page === 1 ? "No transactions yet" : "No more transactions"}
          description={
            page === 1
              ? "Record income, expenses, and fees to keep the ledger in order."
              : "You've reached the end of the ledger."
          }
        />
      ) : (
        <>
          <TransactionsTable transactions={transactions} />
          <div className="flex items-center justify-between mt-4">
            {page > 1 ? (
              <Link
                href={`/transactions?page=${page - 1}`}
                className="text-xs uppercase tracking-widest text-primary hover:text-primary transition-colors font-semibold"
              >
                ← Prev
              </Link>
            ) : (
              <span className="text-xs uppercase tracking-widest text-muted-foreground/50 font-semibold">
                ← Prev
              </span>
            )}
            <span className="text-xs text-muted-foreground">Page {page}</span>
            {transactions.length === PAGE_SIZE ? (
              <Link
                href={`/transactions?page=${page + 1}`}
                className="text-xs uppercase tracking-widest text-primary hover:text-primary transition-colors font-semibold"
              >
                Next →
              </Link>
            ) : (
              <span className="text-xs uppercase tracking-widest text-muted-foreground/50 font-semibold">
                Next →
              </span>
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}