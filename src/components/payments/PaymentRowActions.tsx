"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deletePayment, markPaymentPaid } from "@/app/actions";
import { runAction } from "@/lib/action";

export function PaymentRowActions({
  id,
  status,
  name,
}: {
  id: string;
  status: "pending" | "paid";
  name: string;
}) {
  const router = useRouter();

  async function handleMarkPaid() {
    const result = await runAction(markPaymentPaid, id);
    if (result?.ok) router.refresh();
  }

  async function handleDelete() {
    const result = await runAction(deletePayment, id);
    if (result?.ok) router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {status === "pending" && (
        <Button
          size="sm"
          onClick={handleMarkPaid}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
        >
          Mark paid
        </Button>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete payment for ${name}`}
          >
            <Trash2Icon />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              The {status} payment for {name} will be removed from the ledger.
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}