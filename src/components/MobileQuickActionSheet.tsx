"use client";

import { Drawer } from "vaul";
import { Plus, FolderPlus, DollarSign, Users, Wallet } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export function MobileQuickActionSheet() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
      <Drawer.Trigger asChild>
        <button
          aria-label="Quick Actions"
          className="lg:hidden fixed right-4 bottom-20 z-50 w-12 h-12 rounded-full bg-amber text-ink shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs" />
        <Drawer.Content className="bg-paper border-t border-border flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] p-6">
          <div className="mx-auto w-12 h-1.5 shrink-0 rounded-full bg-border mb-6" />
          <Drawer.Title className="font-display text-xl text-ink mb-2">Quick Actions</Drawer.Title>
          <Drawer.Description className="text-xs text-slate-light mb-6">
            Create transactions, add new projects, or manage team members.
          </Drawer.Description>

          <div className="grid grid-cols-2 gap-3 pb-8">
            <Link
              href="/transactions"
              onClick={() => setIsOpen(false)}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border/80 bg-white hover:border-amber transition-colors text-center"
            >
              <div className="w-10 h-10 rounded-full bg-amber/10 flex items-center justify-center text-amber">
                <DollarSign className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-ink">New Transaction</span>
            </Link>

            <Link
              href="/projects"
              onClick={() => setIsOpen(false)}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border/80 bg-white hover:border-amber transition-colors text-center"
            >
              <div className="w-10 h-10 rounded-full bg-green-ink/10 flex items-center justify-center text-green-ink">
                <FolderPlus className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-ink">New Project</span>
            </Link>

            <Link
              href="/outsourcers"
              onClick={() => setIsOpen(false)}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border/80 bg-white hover:border-amber transition-colors text-center"
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-ink">Add Outsourcer</span>
            </Link>

            <Link
              href="/accounts"
              onClick={() => setIsOpen(false)}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border/80 bg-white hover:border-amber transition-colors text-center"
            >
              <div className="w-10 h-10 rounded-full bg-amber/10 flex items-center justify-center text-amber">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-ink">Add Account</span>
            </Link>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
