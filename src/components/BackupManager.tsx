"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CloudUpload, HardDrive, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { triggerWorkspaceBackup } from "@/lib/r2";

interface BackupRecord {
  id: string;
  fileKey: string;
  fileSize: number;
  createdAt: string;
}

export function BackupManager({ history }: { history: BackupRecord[] }) {
  const [pending, setPending] = useState(false);

  async function handleBackup() {
    setPending(true);
    try {
      const res = await triggerWorkspaceBackup();
      if (res.ok) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to run backup.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-amber">
          <CloudUpload className="w-5 h-5" />
          <CardTitle>Cloudflare R2 Cloud Backups</CardTitle>
        </div>
        <CardDescription>
          Automated S3-compatible snapshot backups stored safely in Cloudflare R2 free tier storage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-amber/5 border border-amber/20 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-amber shrink-0 mt-0.5" />
          <div className="text-xs text-ink space-y-1">
            <p className="font-semibold">Cloudflare R2 Storage Active</p>
            <p className="text-slate-light">
              10 GB free monthly storage with zero egress fees. Snapshots are encrypted and saved securely.
            </p>
          </div>
        </div>

        {history.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-ink uppercase tracking-wider font-mono">Recent Snapshots</p>
            <div className="divide-y divide-border/60 border border-border/80 rounded-lg overflow-hidden bg-white text-xs">
              {history.map((h) => (
                <div key={h.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    <HardDrive className="w-4 h-4 text-slate-light" />
                    <span className="font-mono truncate">{h.fileKey}</span>
                  </div>
                  <span className="text-slate-light font-mono tabular-nums text-[10px]">
                    {(h.fileSize / 1024).toFixed(1)} KB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={handleBackup} disabled={pending} className="bg-ink text-paper hover:bg-ink/90">
          {pending ? "Creating Backup Snapshot…" : "Create R2 Backup Now"}
        </Button>
      </CardFooter>
    </Card>
  );
}
