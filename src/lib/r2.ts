"use server";

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db, schema, isDatabaseConfigured } from "@/db";
import { getTenantId } from "@/lib/tenant";
import { eq, desc } from "drizzle-orm";

const r2AccountId = process.env.R2_ACCOUNT_ID;
const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const r2BucketName = process.env.R2_BUCKET_NAME || "moni-backups";

export async function isR2Configured(): Promise<boolean> {
  return Boolean(r2AccountId && r2AccessKeyId && r2SecretAccessKey);
}

function getR2Client(): S3Client | null {
  if (!r2AccountId || !r2AccessKeyId || !r2SecretAccessKey) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });
}

/* ----------------------------- Encryption ------------------------------- */
// AES-256-GCM via Node's built-in crypto module — no third-party dependency.
// BACKUP_ENCRYPTION_KEY must be a base64-encoded 32-byte key, e.g.
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

interface BackupEnvelope {
  v: 1;
  iv: string;
  authTag: string;
  ciphertext: string;
}

function getEncryptionKey(): Buffer | null {
  const key = process.env.BACKUP_ENCRYPTION_KEY;
  if (!key) return null;
  try {
    const buf = Buffer.from(key, "base64");
    return buf.length === 32 ? buf : null;
  } catch {
    return null;
  }
}

export async function isBackupEncryptionConfigured(): Promise<boolean> {
  return getEncryptionKey() !== null;
}

function encryptJson(plaintext: string): BackupEnvelope {
  const key = getEncryptionKey();
  if (!key) throw new Error("BACKUP_ENCRYPTION_KEY not configured.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
  return {
    v: 1,
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

function decryptJson(envelope: BackupEnvelope): string {
  const key = getEncryptionKey();
  if (!key) throw new Error("BACKUP_ENCRYPTION_KEY not configured.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf-8");
}

/* -------------------------------- Upload -------------------------------- */

export async function uploadBackupToR2(
  content: string | Buffer,
  fileKey: string,
  tenantId: string
): Promise<{ ok: boolean; key?: string; error?: string }> {
  const client = getR2Client();
  if (!client) {
    return { ok: false, error: "Cloudflare R2 credentials not configured." };
  }
  if (!(await isBackupEncryptionConfigured())) {
    return { ok: false, error: "Set BACKUP_ENCRYPTION_KEY to enable backups." };
  }

  try {
    const plaintext = typeof content === "string" ? content : content.toString("utf-8");
    const envelope = encryptJson(plaintext);
    const buffer = Buffer.from(JSON.stringify(envelope), "utf-8");

    const command = new PutObjectCommand({
      Bucket: r2BucketName,
      Key: fileKey,
      Body: buffer,
      ContentType: "application/json",
      Metadata: { tenantId },
    });

    await client.send(command);

    if (isDatabaseConfigured() && db) {
      await db.insert(schema.backups).values({
        tenantId,
        fileKey,
        fileSize: buffer.length,
        provider: "r2",
        encrypted: true,
      });
    }

    return { ok: true, key: fileKey };
  } catch (err) {
    console.error("R2 Upload error:", err);
    return { ok: false, error: "Failed to upload snapshot to R2." };
  }
}

/* ---------------------------- Trigger backup ----------------------------- */

export async function triggerWorkspaceBackup(
  explicitTenantId?: string
): Promise<{ ok: boolean; message: string }> {
  if (!isDatabaseConfigured() || !db) {
    return { ok: false, message: "Database not connected." };
  }

  const tenantId = explicitTenantId ?? (await getTenantId());

  try {
    const [accounts, outsourcers, projects, transactions, payments, settings] =
      await Promise.all([
        db.select().from(schema.accounts).where(eq(schema.accounts.tenantId, tenantId)),
        db.select().from(schema.outsourcers).where(eq(schema.outsourcers.tenantId, tenantId)),
        db.select().from(schema.projects).where(eq(schema.projects.tenantId, tenantId)),
        db.select().from(schema.transactions).where(eq(schema.transactions.tenantId, tenantId)),
        db.select().from(schema.outsourcerPayments).where(eq(schema.outsourcerPayments.tenantId, tenantId)),
        db.select().from(schema.appSettings).where(eq(schema.appSettings.tenantId, tenantId)),
      ]);

    const dumpData = {
      version: "1.1",
      exportedAt: new Date().toISOString(),
      tenantId,
      accounts,
      outsourcers,
      projects,
      transactions,
      payments,
      settings,
    };

    const fileName = `backups/${tenantId}/${new Date().toISOString().slice(0, 10)}_${Date.now()}.json`;

    if (await isR2Configured()) {
      const res = await uploadBackupToR2(JSON.stringify(dumpData, null, 2), fileName, tenantId);
      if (!res.ok) return { ok: false, message: res.error || "R2 upload failed." };
      return { ok: true, message: "Backup successfully stored in Cloudflare R2!" };
    }

    return { ok: true, message: "Snapshot generated successfully (R2 cloud credentials optional)." };
  } catch (err) {
    console.error("Backup trigger error:", err);
    return { ok: false, message: "Could not complete backup." };
  }
}

/* --------------------------------- Restore -------------------------------- */

interface BackupDump {
  version?: string;
  exportedAt?: string;
  tenantId: string;
  accounts?: unknown[];
  outsourcers?: unknown[];
  projects?: unknown[];
  transactions?: unknown[];
  payments?: unknown[];
  settings?: unknown[];
}

function toDate(value: unknown): Date {
  return new Date(value as string);
}

function toDateOrNull(value: unknown): Date | null {
  return value ? new Date(value as string) : null;
}

function asRows(value: unknown[] | undefined): Array<Record<string, unknown>> {
  return (value ?? []) as Array<Record<string, unknown>>;
}

export async function restoreBackupFromR2(fileKey: string): Promise<{ ok: boolean; message: string }> {
  if (!isDatabaseConfigured() || !db) {
    return { ok: false, message: "Database not connected." };
  }

  const client = getR2Client();
  if (!client) {
    return { ok: false, message: "Cloudflare R2 credentials not configured." };
  }
  if (!(await isBackupEncryptionConfigured())) {
    return { ok: false, message: "Set BACKUP_ENCRYPTION_KEY to enable restoring backups." };
  }

  const tenantId = await getTenantId();

  try {
    const obj = await client.send(new GetObjectCommand({ Bucket: r2BucketName, Key: fileKey }));
    if (!obj.Body) {
      return { ok: false, message: "Backup file is empty or unreadable." };
    }

    const raw = await obj.Body.transformToString();
    const envelope = JSON.parse(raw) as BackupEnvelope;
    const plaintext = decryptJson(envelope);
    const dumpData = JSON.parse(plaintext) as BackupDump;

    if (dumpData.tenantId !== tenantId) {
      return {
        ok: false,
        message: "This backup belongs to a different workspace and can't be restored here.",
      };
    }

    await db.transaction(async (tx) => {
      // Delete existing rows in FK-safe order (children before parents).
      await tx.delete(schema.transactions).where(eq(schema.transactions.tenantId, tenantId));
      await tx.delete(schema.outsourcerPayments).where(eq(schema.outsourcerPayments.tenantId, tenantId));
      await tx.delete(schema.projects).where(eq(schema.projects.tenantId, tenantId));
      await tx.delete(schema.outsourcers).where(eq(schema.outsourcers.tenantId, tenantId));
      await tx.delete(schema.accounts).where(eq(schema.accounts.tenantId, tenantId));

      // Re-insert in reverse order (parents before children), preserving original ids.
      const accountRows = asRows(dumpData.accounts);
      if (accountRows.length > 0) {
        await tx.insert(schema.accounts).values(
          accountRows.map((a) => ({
            id: a.id as string,
            tenantId: a.tenantId as string,
            name: a.name as string,
            currency: a.currency as string,
            createdAt: toDate(a.createdAt),
            updatedAt: toDate(a.updatedAt),
          }))
        );
      }

      const outsourcerRows = asRows(dumpData.outsourcers);
      if (outsourcerRows.length > 0) {
        await tx.insert(schema.outsourcers).values(
          outsourcerRows.map((o) => ({
            id: o.id as string,
            tenantId: o.tenantId as string,
            name: o.name as string,
            taxRate: o.taxRate as string,
            transferFeeRate: o.transferFeeRate as string,
            createdAt: toDate(o.createdAt),
            updatedAt: toDate(o.updatedAt),
          }))
        );
      }

      const projectRows = asRows(dumpData.projects);
      if (projectRows.length > 0) {
        await tx.insert(schema.projects).values(
          projectRows.map((p) => ({
            id: p.id as string,
            tenantId: p.tenantId as string,
            title: p.title as string,
            amountUsd: p.amountUsd as string,
            outsourcerId: (p.outsourcerId ?? null) as string | null,
            status: p.status as string,
            createdAt: toDate(p.createdAt),
            updatedAt: toDate(p.updatedAt),
          }))
        );
      }

      const transactionRows = asRows(dumpData.transactions);
      if (transactionRows.length > 0) {
        await tx.insert(schema.transactions).values(
          transactionRows.map((t) => ({
            id: t.id as string,
            tenantId: t.tenantId as string,
            type: t.type as string,
            description: t.description as string,
            amount: t.amount as string,
            currency: t.currency as string,
            projectId: (t.projectId ?? null) as string | null,
            accountId: (t.accountId ?? null) as string | null,
            transactionDate: toDate(t.transactionDate),
            createdAt: toDate(t.createdAt),
            updatedAt: toDate(t.updatedAt),
          }))
        );
      }

      const paymentRows = asRows(dumpData.payments);
      if (paymentRows.length > 0) {
        await tx.insert(schema.outsourcerPayments).values(
          paymentRows.map((p) => ({
            id: p.id as string,
            tenantId: p.tenantId as string,
            outsourcerId: p.outsourcerId as string,
            month: p.month as string,
            grossUsd: p.grossUsd as string,
            taxRate: p.taxRate as string,
            taxUsd: p.taxUsd as string,
            transferFeeRate: p.transferFeeRate as string,
            transferFeeUsd: p.transferFeeUsd as string,
            netUsd: p.netUsd as string,
            exchangeRate: p.exchangeRate as string,
            netPkr: p.netPkr as string,
            status: p.status as string,
            dueDate: p.dueDate as string,
            paidAt: toDateOrNull(p.paidAt),
            createdAt: toDate(p.createdAt),
            updatedAt: toDate(p.updatedAt),
          }))
        );
      }

      // Upsert settings for this tenant (matches the pattern in src/app/actions.ts#updateSettings).
      const settingsRow = asRows(dumpData.settings)[0];
      if (settingsRow) {
        const values = {
          exchangeRate: settingsRow.exchangeRate as string,
          payPercentage: settingsRow.payPercentage as string,
          defaultTaxRate: settingsRow.defaultTaxRate as string,
          defaultTransferFeeRate: settingsRow.defaultTransferFeeRate as string,
        };

        const existing = await tx
          .select()
          .from(schema.appSettings)
          .where(eq(schema.appSettings.tenantId, tenantId))
          .limit(1);

        if (existing.length > 0) {
          await tx
            .update(schema.appSettings)
            .set({ ...values, updatedAt: new Date() })
            .where(eq(schema.appSettings.tenantId, tenantId));
        } else {
          await tx.insert(schema.appSettings).values({ tenantId, ...values });
        }
      }
    });

    revalidatePath("/");
    revalidatePath("/accounts");
    revalidatePath("/transactions");
    revalidatePath("/projects");
    revalidatePath("/outsourcers");
    revalidatePath("/payments");
    revalidatePath("/settings");

    return { ok: true, message: "Workspace restored from backup." };
  } catch (err) {
    console.error("Restore error:", err);
    return { ok: false, message: "Could not restore backup." };
  }
}

/* ------------------------------- History --------------------------------- */

export async function getBackupHistory() {
  if (!isDatabaseConfigured() || !db) return [];
  const tenantId = await getTenantId();

  try {
    const list = await db
      .select()
      .from(schema.backups)
      .where(eq(schema.backups.tenantId, tenantId))
      .orderBy(desc(schema.backups.createdAt))
      .limit(10);

    return list.map((b) => ({
      id: b.id,
      fileKey: b.fileKey,
      fileSize: b.fileSize,
      createdAt: b.createdAt.toISOString(),
      encrypted: b.encrypted,
    }));
  } catch {
    return [];
  }
}
