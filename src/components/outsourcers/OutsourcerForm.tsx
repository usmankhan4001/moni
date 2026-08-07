"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOutsourcer, updateOutsourcer } from "@/app/actions";
import { runAction } from "@/lib/action";

interface OutsourcerFormValue {
  id: string;
  name: string;
  taxRate: number;
  transferFeeRate: number;
}

export function OutsourcerForm({
  outsourcer,
  onDone,
}: {
  outsourcer?: OutsourcerFormValue;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(outsourcer?.name ?? "");
  const [taxRate, setTaxRate] = useState(outsourcer?.taxRate?.toString() ?? "");
  const [transferFeeRate, setTransferFeeRate] = useState(
    outsourcer?.transferFeeRate?.toString() ?? "",
  );
  const [pending, setPending] = useState(false);

  const isEdit = Boolean(outsourcer);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const tax = Number(taxRate);
    const fee = Number(transferFeeRate);
    if (!name.trim()) {
      toast.error("Give the outsourcer a name.");
      return;
    }
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      toast.error("Tax rate must be between 0 and 100.");
      return;
    }
    if (!Number.isFinite(fee) || fee < 0 || fee > 100) {
      toast.error("Transfer fee must be between 0 and 100.");
      return;
    }

    setPending(true);
    const result = outsourcer
      ? await runAction(updateOutsourcer, outsourcer.id, {
          name,
          taxRate: tax,
          transferFeeRate: fee,
        })
      : await runAction(createOutsourcer, {
          name,
          taxRate: tax,
          transferFeeRate: fee,
        });
    setPending(false);

    if (result?.ok) {
      setOpen(false);
      router.refresh();
      onDone?.();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={isEdit ? "ghost" : "default"} size={isEdit ? "sm" : "default"}>
          {isEdit ? "Edit" : "Add outsourcer"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit outsourcer" : "Add outsourcer"}</DialogTitle>
          <DialogDescription>
            Set the percentage deductions that apply to this outsourcer&apos;s
            project value.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="outsourcer-name">Name</Label>
            <Input
              id="outsourcer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ahmed Khan"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="outsourcer-tax">Tax rate (%)</Label>
              <Input
                id="outsourcer-tax"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="any"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                placeholder="5"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outsourcer-fee">Transfer fee (%)</Label>
              <Input
                id="outsourcer-fee"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step="any"
                value={transferFeeRate}
                onChange={(e) => setTransferFeeRate(e.target.value)}
                placeholder="2"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add outsourcer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}