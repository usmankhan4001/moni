import { db, schema, isDatabaseConfigured } from "@/db";
import { runMigrations } from "@/db/migrate";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { getDeploymentMode } from "@/lib/deployment-mode";

export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
export const DEFAULT_TENANT_SLUG = "default";

// Re-exported for the many Node-runtime callers that already import it from
// here. The implementation lives in its own DB-free module because
// middleware.ts (Edge Runtime) needs it and must not pull `pg` into its
// bundle — see the comment in src/lib/deployment-mode.ts. Do NOT move the
// implementation back into this file.
export { getDeploymentMode };
export type { DeploymentMode } from "@/lib/deployment-mode";

let migrationPromise: Promise<void> | null = null;

export async function ensureMigrations(): Promise<void> {
  if (!isDatabaseConfigured() || !db) return;
  if (!migrationPromise) {
    migrationPromise = runMigrations().catch((err) => {
      console.error("Auto migration error:", err);
      migrationPromise = null;
    });
  }
  return migrationPromise;
}

/**
 * Ensures the default workspace exists in single-user mode or fallback setups.
 */
export async function ensureDefaultTenant(): Promise<string> {
  if (!isDatabaseConfigured() || !db) return DEFAULT_TENANT_ID;

  await ensureMigrations();

  try {
    const existing = await db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.id, DEFAULT_TENANT_ID))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(schema.tenants).values({
        id: DEFAULT_TENANT_ID,
        name: "Personal Workspace",
        slug: DEFAULT_TENANT_SLUG,
        plan: "pro",
      }).onConflictDoNothing();

      // Initialize default app settings for this workspace
      await db.insert(schema.appSettings).values({
        tenantId: DEFAULT_TENANT_ID,
        exchangeRate: "284.50",
        payPercentage: "70.00",
        defaultTaxRate: "5.00",
        defaultTransferFeeRate: "2.00",
      }).onConflictDoNothing();
    }
  } catch (err) {
    console.error("Error ensuring default tenant:", err);
  }

  return DEFAULT_TENANT_ID;
}

/**
 * Resolves the active tenant ID for the current request.
 *
 * single_user mode: always the single default workspace — zero friction,
 * unchanged from before.
 *
 * multi_tenant mode: derived EXCLUSIVELY from a cryptographically verified
 * session (see src/lib/auth.ts#getSession). There is intentionally no
 * fallback to a client-supplied cookie, header, or subdomain here — that
 * was the vulnerability (anyone could send `x-tenant-id` or a
 * `moni_tenant_id` cookie and read/write any tenant's data with zero
 * verification). If there's no valid session, this throws rather than
 * silently falling back to a default tenant.
 */
export async function getTenantId(): Promise<string> {
  const mode = getDeploymentMode();

  if (mode === "single_user") {
    return ensureDefaultTenant();
  }

  await ensureMigrations();

  const session = await getSession();
  if (!session) throw new Error("Not authenticated.");
  return session.tenantId;
}
