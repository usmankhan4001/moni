"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createTransaction } from "@/app/actions";
import { runAction } from "@/lib/action";
type Currency = "USD" | "PKR";
type TransactionType = "income" | "expense" | "fee";

const NONE = "__none__";

const TYPE_OPTIONS: { value: TransactionType; label: string }[] = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "fee", label: "Fee" },
];

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export function NewTransactionDialog({
  projects,
  accounts,
}: {
  projects: { id: string; title: string }[];
  accounts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [projectId, setProjectId] = useState(NONE);
  const [accountId, setAccountId] = useState(NONE);
  const [date, setDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDate(todayISO());
  }, []);

  function reset() {
    setType("expense");
    setDescription("");
    setAmount("");
    setCurrency("USD");
    setProjectId(NONE);
    setAccountId(NONE);
    setDate(todayISO());
  }

  async function handleSubmit() {
    setSubmitting(true);
    const result = await runAction(createTransaction, {
      type,
      description,
      amount: Number(amount),
      currency,
      project_id: projectId === NONE ? null : projectId,
      account_id: accountId === NONE ? null : accountId,
      transaction_date: date,
    });
    if (result?.ok) {
      setOpen(false);
      reset();
      router.refresh();
    }
    setSubmitting(false);
  }

  const canSubmit = description.trim().length > 0 && Number(amount) > 0 && Boolean(date);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon />
          Add transaction
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
          <DialogDescription>
            Record income, an expense, or a transfer fee in the ledger.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as TransactionType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tx-description">Description</Label>
            <Input
              id="tx-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Client payment — Acme Corp"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD $</SelectItem>
                  <SelectItem value="PKR">PKR Rs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full sm:w-auto"
          >
            {submitting ? "Saving…" : "Save transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}