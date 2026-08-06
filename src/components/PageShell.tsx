import { Sidebar } from "@/components/Sidebar";

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
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 max-lg:w-full">
        <div className="page-enter">
          <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 lg:top-0 z-40">
            <div className="px-5 lg:px-8 py-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
                  {eyebrow}
                </p>
                <h1 className="font-display text-3xl text-foreground">{title}</h1>
              </div>
              {actions && <div className="shrink-0">{actions}</div>}
            </div>
          </header>
          <div className="p-5 lg:p-8">{children}</div>
        </div>
      </main>
    </div>
  );
}