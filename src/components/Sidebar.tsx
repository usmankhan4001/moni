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
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col z-50 max-lg:hidden shadow-sm">
        <div className="px-6 py-8 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-display text-2xl font-bold flex items-center justify-center shadow-sm">
              M
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Moni</h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
                Workspace
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 space-y-1.5 px-4 overflow-y-auto no-scrollbar" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200
                  ${
                    isActive
                      ? "bg-primary text-primary-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} strokeWidth={isActive ? 2.5 : 2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-6 py-6 border-t border-border bg-muted/30">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
            Live FX Rate
          </p>
          <p className="font-mono text-sm text-primary font-semibold tabular-nums">
            USD 1 = PKR 284.50
          </p>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-header px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground font-display text-xl font-bold flex items-center justify-center shadow-sm">
            M
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">Moni</span>
        </Link>
        <div className="flex items-center gap-3 bg-muted px-3 py-1.5 rounded-full border border-border">
          <span className="font-mono text-[10px] font-semibold text-primary tabular-nums">USD/PKR 284.50</span>
        </div>
      </header>

      {/* Mobile Bottom Dock Navigation */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-header bg-background/90 text-foreground pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_-8px_rgba(0,0,0,0.1)]"
        aria-label="Mobile Navigation"
      >
        <div className="flex justify-around items-center px-1">
          {navItems.map((item, idx) => {
            // Only show top 5 items on mobile dock to avoid crowding. Put Settings behind a menu or hide.
            // Let's show: Dashboard, Projects, Add(FAB), Transactions, Outsourcers
            if (idx > 4 && item.label !== "Settings") return null; 
            if (idx === 2) {
              return (
                <div key="fab-slot" className="flex items-center justify-center w-[20%]">
                  <MobileQuickActionSheet />
                </div>
              );
            }
            
            // Adjust the actual links mapping based on the visual layout
            // Let's explicitly define the mobile nav array for clarity.
            return null;
          })}
          
          <MobileNavItem href="/" label="Home" icon={LayoutDashboard} active={pathname === "/"} />
          <MobileNavItem href="/projects" label="Projects" icon={FolderKanban} active={pathname === "/projects"} />
          
          <div className="flex items-center justify-center w-[20%] pt-1">
             <MobileQuickActionSheet />
          </div>
          
          <MobileNavItem href="/transactions" label="Ledger" icon={ArrowLeftRight} active={pathname === "/transactions"} />
          <MobileNavItem href="/settings" label="Settings" icon={Settings2} active={pathname === "/settings"} />
        </div>
      </nav>
    </>
  );
}

function MobileNavItem({ href, label, icon: Icon, active }: { href: string, label: string, icon: any, active: boolean }) {
  return (
    <Link
      href={href}
      className={`
        flex flex-col items-center justify-center w-[20%] py-3 gap-1 transition-colors
        ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}
      `}
    >
      <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
      <span className={`text-[9px] font-medium tracking-wide ${active ? "font-bold" : ""}`}>{label}</span>
    </Link>
  );
}
