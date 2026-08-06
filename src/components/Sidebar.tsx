"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  ReceiptText,
  ArrowLeftRight,
  Users2,
  Wallet2,
  Settings2,
} from "lucide-react";
import { MobileQuickActionSheet } from "@/components/MobileQuickActionSheet";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/payments", label: "Payments", icon: ReceiptText },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/outsourcers", label: "Outsourcers", icon: Users2 },
  { href: "/accounts", label: "Accounts", icon: Wallet2 },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-ink text-paper flex flex-col z-50 max-lg:hidden border-r border-white/10">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber text-ink font-display text-xl font-bold flex items-center justify-center">
              M
            </div>
            <div>
              <h1 className="font-display text-2xl tracking-tight leading-none text-paper">Moni</h1>
              <p className="text-[10px] text-paper/50 mt-1 font-mono uppercase tracking-widest">
                Finance Manager
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all
                  ${
                    isActive
                      ? "bg-amber/15 text-amber font-semibold border-l-2 border-amber"
                      : "text-paper/70 hover:text-paper hover:bg-white/5"
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-amber" : "text-paper/60"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-white/10 bg-white/5">
          <p className="text-[10px] uppercase tracking-widest text-paper/50 mb-1">
            Live FX Rate
          </p>
          <p className="font-mono text-base text-amber font-semibold tabular-nums">
            USD 1 = PKR 284.50
          </p>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-ink text-paper px-5 py-3.5 flex items-center justify-between border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-amber text-ink font-display text-lg font-bold flex items-center justify-center">
            M
          </div>
          <span className="font-display text-xl tracking-tight text-paper">Moni</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-amber tabular-nums">$→Rs 284.50</span>
        </div>
      </header>

      {/* Mobile Bottom Dock Navigation */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-ink/95 backdrop-blur-md text-paper pb-[env(safe-area-inset-bottom)]"
        aria-label="Mobile Navigation"
      >
        <div className="grid grid-cols-7 text-center">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`
                  flex flex-col items-center justify-center py-2.5 text-[9px] font-medium uppercase tracking-tighter transition-colors
                  ${isActive ? "text-amber font-bold" : "text-paper/50 hover:text-paper"}
                `}
              >
                <Icon className={`w-4 h-4 mb-0.5 ${isActive ? "text-amber" : "text-paper/60"}`} />
                <span className="truncate max-w-[42px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Floating Action Button */}
      <MobileQuickActionSheet />
    </>
  );
}
