import { getSettings, isReady } from "@/lib/data";
import type { AppSettings } from "@/lib/data";
import { formatPKR, formatUSD } from "@/lib/format";
import { calculateOutsourcerPayment } from "@/lib/payments";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/PageShell";
import { SetupRequiredBanner } from "@/components/EmptyState";
import { SettingsForm } from "@/components/settings-form";
import { BackupManager } from "@/components/BackupManager";
import { getBackupHistory } from "@/lib/r2";

export const dynamic = "force-dynamic";

const STEPS: Array<(s: AppSettings) => string> = [
  () => "Start with the gross value of an outsourcer's completed projects, in USD.",
  (s) => `Deduct tax at ${s.default_tax_rate}% of the gross — this is what they pay up front.`,
  (s) =>
    `Deduct the transfer fee at ${s.default_transfer_fee_rate}% of the amount left after tax.`,
  (s) =>
    `Convert the remaining USD to PKR at ${s.exchange_rate} — that's their true net.`,
  (s) =>
    `Multiply by the pay percentage (${s.pay_percentage}%) — the share you actually pay out each month.`,
];

const EXAMPLE_GROSS_USD = 1000;

export default async function SettingsPage() {
  const ready = isReady();
  const settings = await getSettings();
  const backupHistory = await getBackupHistory();

  const example = calculateOutsourcerPayment(EXAMPLE_GROSS_USD, {
    taxRate: settings.default_tax_rate,
    transferFeeRate: settings.default_transfer_fee_rate,
    exchangeRate: settings.exchange_rate,
    payPercentage: settings.pay_percentage,
  });

  return (
    <PageShell eyebrow="Business" title="Settings & Backups">
      {!ready ? (
        <SetupRequiredBanner />
      ) : (
        <div className="space-y-6">
          <SettingsForm settings={settings} />

          <BackupManager history={backupHistory} />

          <Card>
            <CardHeader>
              <CardTitle>How payments are calculated</CardTitle>
              <CardDescription>
                Every monthly payment follows the same chain, from a project&apos;s
                gross value down to what an outsourcer is owed.
              </CardDescription>
            </CardHeader>
            <div className="px-6 pb-6">
              <ol className="space-y-3">
                {STEPS.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber/10 font-mono text-xs font-semibold text-amber tabular-nums">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{step(settings)}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 rounded-sm bg-ledger/50 p-4 text-xs text-muted-foreground">
                So a{" "}
                <span className="font-mono font-medium text-ink tabular-nums">
                  {formatUSD(EXAMPLE_GROSS_USD, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>{" "}
                project nets{" "}
                <span className="font-mono font-medium text-ink tabular-nums">
                  {formatPKR(example.netPkr)}
                </span>{" "}
                in PKR after all deductions at the current rates, and the
                outsourcer would receive{" "}
                <span className="font-mono font-medium text-amber tabular-nums">
                  {formatPKR(example.payAmountPkr)}
                </span>{" "}
                — that&apos;s the {settings.pay_percentage}% you pass along.
              </p>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
