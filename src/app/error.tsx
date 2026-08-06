"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Uncaught Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white border border-border/80 rounded-2xl p-8 shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-display text-2xl text-ink">System Error Occurred</h2>
        <p className="text-xs text-slate-light leading-relaxed">
          {error?.message || "Moni encountered an unexpected issue while loading database workspace records."}
        </p>
        <div className="pt-2">
          <Button onClick={() => reset()} className="gap-2 bg-ink text-paper hover:bg-ink/90">
            <RefreshCw className="w-4 h-4" />
            <span>Reload Application</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
