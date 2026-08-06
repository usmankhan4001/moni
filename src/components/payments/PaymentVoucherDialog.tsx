"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText } from "lucide-react";
import { formatUSD, formatPKR } from "@/lib/format";

interface PaymentVoucherProps {
  payment: {
    id: string;
    outsourcer_name: string | null;
    month: string;
    gross_usd: number;
    tax_rate: number;
    tax_usd: number;
    transfer_fee_rate: number;
    transfer_fee_usd: number;
    net_usd: number;
    exchange_rate: number;
    net_pkr: number;
    status: "pending" | "paid";
    due_date: string;
    paid_at: string | null;
  };
}

export function PaymentVoucherDialog({ payment }: PaymentVoucherProps) {
  const [open, setOpen] = useState(false);

  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <FileText className="w-3.5 h-3.5" />
          <span>Voucher</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-background p-6 print:p-0 print:border-none">
        <DialogHeader className="print:hidden">
          <DialogTitle className="font-display text-xl text-foreground">Payment Voucher</DialogTitle>
        </DialogHeader>

        <div id="payment-voucher" className="space-y-6 pt-2">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/80 pb-4">
            <div>
              <h2 className="font-display text-2xl text-foreground">Moni</h2>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Freelance Finance Manager
              </p>
            </div>
            <div className="text-right">
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  payment.status === "paid"
                    ? "bg-emerald-600/10 text-emerald-600 border border-emerald-600/20"
                    : "bg-primary/10 text-primary border border-primary/20"
                }`}
              >
                {payment.status}
              </span>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                Month: {payment.month.slice(0, 7)}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Outsourcer Name</span>
              <span className="font-semibold text-foreground">{payment.outsourcer_name || "N/A"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Gross Earnings (USD)</span>
              <span className="font-mono font-medium">{formatUSD(payment.gross_usd)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Tax Deduction ({payment.tax_rate}%)</span>
              <span className="font-mono text-destructive">− {formatUSD(payment.tax_usd)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Transfer Fee ({payment.transfer_fee_rate}%)</span>
              <span className="font-mono text-destructive">− {formatUSD(payment.transfer_fee_usd)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Net Amount (USD)</span>
              <span className="font-mono font-semibold text-foreground">{formatUSD(payment.net_usd)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/40">
              <span className="text-muted-foreground">Exchange Rate</span>
              <span className="font-mono">USD 1 = PKR {payment.exchange_rate}</span>
            </div>

            {/* Total Payable PKR */}
            <div className="flex justify-between py-3 bg-primary/10 border border-primary/30 rounded-lg px-4 mt-4">
              <span className="font-bold text-foreground">Total Net Payout (PKR)</span>
              <span className="font-mono font-bold text-lg text-primary">
                {formatPKR(payment.net_pkr)}
              </span>
            </div>
          </div>

          {/* Footer print action */}
          <div className="flex justify-end gap-2 pt-2 print:hidden">
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="w-4 h-4" />
              <span>Print / Export PDF</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
