"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "□" },
  { href: "/projects", label: "Projects", icon: "◇" },
  { href: "/payments", label: "Payments", icon: "◈" },
  { href: "/transactions", label: "Transactions", icon: "≡" },
  { href: "/outsourcers", label: "Outsourcers", icon: "◎" },
  { href: "/accounts", label: "Accounts", icon: "₿" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-ink text-paper flex flex-col z-50 max-lg:hidden">
        <div className="px-6 py-6 border-b border-white/10">
          <h1 className="font-display text-2xl tracking-tight">Hisaab</h1>
          <p className="text-xs text-white/40 mt-1 font-mono uppercase tracking-widest">
            Finance Ledger
          </p>
        </div>

        <nav className="flex-1 py-4" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`
                  flex items-center gap-3 px-6 py-3 text-sm transition-colors
                  ${isActive
                    ? "bg-white/10 text-amber border-r-2 border-amber"
                    : "text-paper/60 hover:text-paper hover:bg-white/5"
                  }
                `}
              >
                <span className="text-base w-5 text-center opacity-70">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-4 border-t border-white/10">
          <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">USD → PKR</p>
          <p className="font-mono text-lg text-amber font-semibold tabular-nums">284.50</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-50 bg-ink text-paper px-5 py-3 flex items-center justify-between">
        <Link href="/" className="font-display text-xl">Hisaab</Link>
        <span className="font-mono text-xs text-amber tabular-nums">$→Rs 284.50</span>
      </header>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-ink text-paper"
        aria-label="Mobile"
      >
        <div className="grid grid-cols-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`
                  flex flex-col items-center gap-0.5 py-2.5 text-[9px] font-medium uppercase tracking-wide
                  ${isActive ? "text-amber" : "text-paper/50 hover:text-paper"}
                `}
              >
                <span className="text-base leading-none opacity-80">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}