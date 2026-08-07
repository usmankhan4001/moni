import { db, schema, isDatabaseConfigured } from "@/db";
import { runMigrations } from "@/db/migrate";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
export const DEFAULT_TENANT_SLUG = "default";

export type DeploymentMode = "single_user" | "multi_tenant";

const DEPLOYMENT_MODES: readonly string[] = ["single_user", "multi_tenant"];

/**
 * Reads DEPLOYMENT_MODE, tolerating the hyphenated spelling people naturally
 * type ("single-user") since the underscore form is easy to get wrong.
 *
 * This used to be a blind `as DeploymentMode` cast, which meant any typo
 * produced a mode string matching NEITHER branch of getTenantId() — so
 * "single-user" silently took the multi-tenant path and threw
 * "Not authenticated." on every data page of a no-auth deployment.
 *
 * An unrecognised value now fails CLOSED (multi_tenant) rather than defaulting
 * to single_user: guessing single_user would disable authentication outright
 * on a real multi-tenant install, which is far worse than an outage.
 */
export function getDeploymentMode(): DeploymentMode {
  const raw = process.env.DEPLOYMENT_MODE;
  if (!raw?.trim()) return "single_user";

  const normalized = raw.trim().toLowerCase().replace(/-/g, "_");
  if (DEPLOYMENT_MODES.includes(normalized)) return normalized as DeploymentMode;

  console.error(
    `Invalid DEPLOYMENT_MODE ${JSON.stringify(raw)} — expected one of ` +
      `${DEPLOYMENT_MODES.join(" | ")}. Failing closed to multi_tenant.`,
  );
  return "multi_tenant";
}

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
