"use client";

import { Button } from "@/components/ui/button";
import { seedDemoData } from "@/app/actions";

export function SeedButton({ label = "Load demo data" }: { label?: string }) {
  return (
    <Button
      variant="outline"
      onClick={async () => {
        const result = await seedDemoData();
        if (result.ok) {
          window.location.reload();
        }
      }}
    >
      {label}
    </Button>
  );
}