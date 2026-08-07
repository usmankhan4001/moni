import { Sidebar } from "@/components/layout/Sidebar";

export function PageShell({
  eyebrow,
  title,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-64 w-full flex flex-col pt-16 lg:pt-0 pb-[80px] lg:pb-0">
        <header className="glass-header sticky top-0 z-40">
          <div className="px-5 lg:px-10 py-5 lg:py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary font-semibold mb-1">
                {eyebrow}
              </p>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
            </div>
            {actions && <div className="shrink-0 flex items-center gap-3">{actions}</div>}
          </div>
        </header>
        <div className="p-5 lg:p-10 flex-1">{children}</div>
      </main>
    </div>
  );
}
