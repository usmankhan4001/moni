"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { generateMonthlyPayments } from "@/app/actions";
import { runAction } from "@/lib/action";
import { currentMonthKey, monthLabel } from "@/lib/date";

export function GeneratePaymentDialog({
  exchangeRate,
  payPercentage,
  triggerLabel = "New payment",
}: {
  exchangeRate: number;
  payPercentage: number;
  triggerLabel?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm">{triggerLabel}</Button>
      </DialogTrigger>
      <GeneratePaymentFields exchangeRate={exchangeRate} payPercentage={payPercentage} />
    </Dialog>
  );
}

export function GeneratePaymentFields({
  exchangeRate,
  payPercentage,
}: {
  exchangeRate: number;
  payPercentage: number;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(currentMonthKey());
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleGenerate() {
    setRunning(true);
    const res = await runAction(generateMonthlyPayments, {
      month,
      exchangeRate,
      payPercentage,
    });
    if (res?.ok) {
      setResult(res.message);
      router.refresh();
    }
    setRunning(false);
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Generate monthly payments</DialogTitle>
        <DialogDescription>
          Builds a pending payment for every outsourcer with completed projects
          in the chosen month.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="payment-month">Month</Label>
          <Input
            id="payment-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label>Rate &amp; share</Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                1 USD in PKR
              </p>
              <p className="mt-1 font-mono text-sm font-medium tabular-nums text-foreground">
                {exchangeRate.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Pay share
              </p>
              <p className="mt-1 font-mono text-sm font-medium tabular-nums text-foreground">
                {payPercentage}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-foreground">
          {result}
        </div>
      )}

      <DialogFooter>
        <Button type="button" onClick={handleGenerate} disabled={running || !month}>
          {running ? "Generating…" : `Generate for ${monthLabel(month)}`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}