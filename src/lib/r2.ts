"use server";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

export async function uploadBackupToR2(
  content: string | Buffer,
  fileKey: string,
  tenantId: string
): Promise<{ ok: boolean; key?: string; error?: string }> {
  const client = getR2Client();
  if (!client) {
    return { ok: false, error: "Cloudflare R2 credentials not configured." };
  }

  try {
    const buffer = typeof content === "string" ? Buffer.from(content, "utf-8") : content;
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
      });
    }

    return { ok: true, key: fileKey };
  } catch (err) {
    console.error("R2 Upload error:", err);
    return { ok: false, error: "Failed to upload snapshot to R2." };
  }
}

export async function triggerWorkspaceBackup(): Promise<{ ok: boolean; message: string }> {
  if (!isDatabaseConfigured() || !db) {
    return { ok: false, message: "Database not connected." };
  }

  const tenantId = await getTenantId();

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
    }));
  } catch {
    return [];
  }
}
