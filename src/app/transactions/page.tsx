import { PageShell } from "@/components/layout/PageShell";
import { EmptyState, SetupRequiredBanner } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { NewTransactionDialog } from "@/components/transactions/NewTransactionDialog";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import {
  getAccounts,
  getProjects,
  getSettings,
  getTransactions,
  isReady,
} from "@/lib/data";
import { formatUSD } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const configured = isReady();
  const [transactions, projects, accounts, settings] = await Promise.all([
    getTransactions(),
    getProjects(),
    getAccounts(),
    getSettings(),
  ]);

  if (!configured) {
    return (
      <PageShell eyebrow="Ledger" title="Transactions">
        <SetupRequiredBanner />
      </PageShell>
    );
  }

  const rate = settings.exchange_rate;
  let incomeUsd = 0;
  let expenseUsd = 0;
  let feeUsd = 0;
  for (const transaction of transactions) {
    const usd =
      transaction.currency === "USD"
        ? transaction.amount
        : transaction.amount / rate;
    if (transaction.type === "income") incomeUsd += usd;
    else if (transaction.type === "expense") expenseUsd += usd;
    else feeUsd += usd;
  }

  const rateNote = `PKR converted at Rs ${rate.toFixed(2)}/USD`;

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
          title="No transactions yet"
          description="Record income, expenses, and fees to keep the ledger in order."
        />
      ) : (
        <TransactionsTable transactions={transactions} />
      )}
    </PageShell>
  );
}