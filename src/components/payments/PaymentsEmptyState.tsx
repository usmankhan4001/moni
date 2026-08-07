"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { GeneratePaymentFields } from "@/components/payments/GeneratePaymentDialog";

export function PaymentsEmptyState({
  exchangeRate,
  payPercentage,
}: {
  exchangeRate: number;
  payPercentage: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <EmptyState
        title="No payments yet"
        description="Complete projects and generate a monthly payment run."
        actionLabel="Generate payments"
        onAction={() => setOpen(true)}
      />
      <GeneratePaymentFields exchangeRate={exchangeRate} payPercentage={payPercentage} />
    </Dialog>
  );
}