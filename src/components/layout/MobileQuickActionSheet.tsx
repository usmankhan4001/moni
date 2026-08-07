"use client";

import { Drawer } from "vaul";
import { Plus, FolderPlus, DollarSign, Users, Wallet, ReceiptText } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export function MobileQuickActionSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Trigger asChild>
        <button
          aria-label="Quick Actions"
          className="relative -top-3 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition-transform border-4 border-background"
        >
          <Plus className="w-6 h-6" strokeWidth={3} />
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
        <Drawer.Content className="bg-card border-t border-border flex flex-col rounded-t-3xl fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl">
          <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-border mb-6" />
          <Drawer.Title className="font-display text-2xl font-semibold text-foreground mb-1">Quick Actions</Drawer.Title>
          <Drawer.Description className="text-sm text-muted-foreground mb-6">
            What would you like to do?
          </Drawer.Description>

          <div className="grid grid-cols-2 gap-4 pb-2">
            <Link
              href="/transactions"
              onClick={() => setIsOpen(false)}
              className="flex flex-col items-start gap-3 p-4 rounded-2xl border border-border bg-muted/30 hover:border-primary transition-colors hover:bg-primary/5"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <DollarSign className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold text-foreground">New Transaction</span>
            </Link>

            <Link
              href="/projects"
              onClick={() => setIsOpen(false)}
              className="flex flex-col items-start gap-3 p-4 rounded-2xl border border-border bg-muted/30 hover:border-emerald-600 transition-colors hover:bg-emerald-600/5"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-600">
                <FolderPlus className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold text-foreground">New Project</span>
            </Link>

            <Link
              href="/payments"
              onClick={() => setIsOpen(false)}
              className="flex flex-col items-start gap-3 p-4 rounded-2xl border border-border bg-muted/30 hover:border-amber-600 transition-colors hover:bg-amber-600/5"
            >
              <div className="w-10 h-10 rounded-full bg-amber-600/10 flex items-center justify-center text-amber-600">
                <ReceiptText className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold text-foreground">Run Payouts</span>
            </Link>

            <Link
              href="/outsourcers"
              onClick={() => setIsOpen(false)}
              className="flex flex-col items-start gap-3 p-4 rounded-2xl border border-border bg-muted/30 hover:border-blue-600 transition-colors hover:bg-blue-600/5"
            >
              <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-600">
                <Users className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-semibold text-foreground">Add Outsourcer</span>
            </Link>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
