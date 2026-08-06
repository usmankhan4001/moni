import { getAccounts, getSettings } from "@/lib/data";
import { formatPKR, formatUSD, pluralize } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { PageShell } from "@/components/PageShell";
import { EmptyState } from "@/components/EmptyState";
import { StatCard } from "@/components/StatCard";
import { AccountForm } from "@/components/account-form";
import { DeleteAccountButton } from "@/components/account-delete";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const [accounts, settings] = await Promise.all([getAccounts(), getSettings()]);

  const usdAccounts = accounts.filter((a) => a.currency === "USD");
  const pkrAccounts = accounts.filter((a) => a.currency === "PKR");
  const usdTotal = usdAccounts.reduce((sum, a) => sum + a.balance, 0);
  const pkrTotal = pkrAccounts.reduce((sum, a) => sum + a.balance, 0);
  const usdInPkr = usdTotal * settings.exchange_rate;
  const netPkr = usdInPkr + pkrTotal;

  return (
    <PageShell eyebrow="Holdings" title="Accounts" actions={<AccountForm />}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          label="Accounts"
          value={String(accounts.length)}
          sublabel={pluralize(accounts.length, "account")}
        />
        <StatCard
          label="USD holdings"
          value={formatUSD(usdTotal, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          })}
          sublabel={`≈ ${formatPKR(usdInPkr)} at ${settings.exchange_rate}`}
          accent="amber"
        />
        <StatCard
          label="PKR holdings"
          value={formatPKR(pkrTotal)}
          sublabel={pluralize(pkrAccounts.length, "PKR account")}
        />
        <StatCard
          label="Net worth"
          value={formatPKR(netPkr)}
          sublabel="All currency, converted to PKR"
          accent="green"
        />
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Add a Wise USD balance and a PKR bank account to watch where funds sit."
        />
      ) : (
        <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => {
            const isUsd = account.currency === "USD";
            const count = isUsd ? usdAccounts.length : pkrAccounts.length;
            return (
              <div
                key={account.id}
                className="bg-white border border-ledger-dark/50 rounded-sm p-5 hover:border-amber/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg text-ink truncate">
                      {account.name}
                    </h3>
                    <Badge
                      variant="secondary"
                      className="mt-1 font-mono text-[11px] uppercase"
                    >
                      {account.currency}
                    </Badge>
                  </div>
                  <DeleteAccountButton id={account.id} name={account.name} />
                </div>

                <div className="mt-4 pt-4 border-t border-ledger/50">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-slate-light mb-1">
                    Balance
                  </p>
                  <p className="font-mono text-2xl font-semibold text-ink tabular-nums">
                    {isUsd ? formatUSD(account.balance) : formatPKR(account.balance)}
                  </p>
                  <p className="text-xs text-slate-light mt-1.5">
                    {count === 1
                      ? "Only one in this currency"
                      : `${count} ${account.currency} accounts in total`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}