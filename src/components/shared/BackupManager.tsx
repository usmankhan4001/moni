"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CloudUpload, HardDrive, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { triggerWorkspaceBackup, restoreBackupFromR2 } from "@/lib/r2";
import { runAction } from "@/lib/action";

interface BackupRecord {
  id: string;
  fileKey: string;
  fileSize: number;
  createdAt: string;
  encrypted: boolean;
}

function RestoreBackupButton({ fileKey }: { fileKey: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleRestore() {
    setPending(true);
    const result = await runAction(restoreBackupFromR2, fileKey);
    setPending(false);
    if (result?.ok) {
      router.refresh();
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          Restore
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore this snapshot?</AlertDialogTitle>
          <AlertDialogDescription>
            This replaces ALL current data in this workspace — accounts, outsourcers,
            projects, transactions, and payments — with the contents of this backup.
            This can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleRestore} disabled={pending}>
            {pending ? "Restoring…" : "Restore"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function BackupManager({
  history,
  r2Configured,
  encryptionConfigured,
}: {
  history: BackupRecord[];
  r2Configured: boolean;
  encryptionConfigured: boolean;
}) {
  const [pending, setPending] = useState(false);
  const ready = r2Configured && encryptionConfigured;

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
        <div className="flex items-center gap-2 text-primary">
          <CloudUpload className="w-5 h-5" />
          <CardTitle>Cloudflare R2 Cloud Backups</CardTitle>
        </div>
        <CardDescription>
          Automated S3-compatible snapshot backups stored safely in Cloudflare R2 free tier storage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ready ? (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-foreground space-y-1">
              <p className="font-semibold">Cloudflare R2 Storage Active</p>
              <p className="text-muted-foreground">
                Backups are encrypted with AES-256-GCM before upload, and run automatically
                once a day if the cron sidecar is configured (see README), or on demand below.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-muted/50 border border-border flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-foreground space-y-1.5">
              <p className="font-semibold">Cloud backups not configured</p>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {!r2Configured && (
                  <li>
                    Missing <span className="font-mono">R2_ACCOUNT_ID</span>,{" "}
                    <span className="font-mono">R2_ACCESS_KEY_ID</span>, and/or{" "}
                    <span className="font-mono">R2_SECRET_ACCESS_KEY</span> — Cloudflare R2 credentials.
                  </li>
                )}
                {!encryptionConfigured && (
                  <li>
                    Missing <span className="font-mono">BACKUP_ENCRYPTION_KEY</span> — a base64-encoded
                    32-byte key used to encrypt snapshots before upload.
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider font-mono">Recent Snapshots</p>
            <div className="divide-y divide-border/60 border border-border/80 rounded-lg overflow-hidden bg-card text-xs">
              {history.map((h) => (
                <div key={h.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 truncate">
                    <HardDrive className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-mono truncate">{h.fileKey}</span>
                    {h.encrypted && (
                      <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" aria-label="Encrypted" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-muted-foreground font-mono tabular-nums text-[10px]">
                      {(h.fileSize / 1024).toFixed(1)} KB
                    </span>
                    <RestoreBackupButton fileKey={h.fileKey} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col items-end gap-1.5">
        {!ready && (
          <p className="text-[11px] text-muted-foreground">
            Set the missing environment variable{!r2Configured && !encryptionConfigured ? "s" : ""} above to enable backups.
          </p>
        )}
        <Button
          onClick={handleBackup}
          disabled={pending || !ready}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {pending ? "Creating Backup Snapshot…" : "Create R2 Backup Now"}
        </Button>
      </CardFooter>
    </Card>
  );
}
