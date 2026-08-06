import { cookies, headers } from "next/headers";
import { db, schema, isDatabaseConfigured } from "@/db";
import { eq } from "drizzle-orm";

export const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
export const DEFAULT_TENANT_SLUG = "default";

export type DeploymentMode = "single_user" | "multi_tenant";

export function getDeploymentMode(): DeploymentMode {
  return (process.env.DEPLOYMENT_MODE as DeploymentMode) || "single_user";
}

/**
 * Ensures the default workspace exists in single-user mode or fallback setups.
 */
export async function ensureDefaultTenant(): Promise<string> {
  if (!isDatabaseConfigured() || !db) return DEFAULT_TENANT_ID;

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
 * Resolves active tenant ID based on DEPLOYMENT_MODE, request headers, cookies, or subdomain.
 */
export async function getTenantId(): Promise<string> {
  const mode = getDeploymentMode();

  if (mode === "single_user") {
    return ensureDefaultTenant();
  }

  // Multi-tenant mode: Check request headers or cookies
  try {
    const cookieStore = await cookies();
    const tenantCookie = cookieStore.get("moni_tenant_id")?.value;
    if (tenantCookie) return tenantCookie;

    const headerList = await headers();
    const headerTenant = headerList.get("x-tenant-id");
    if (headerTenant) return headerTenant;

    // Subdomain resolution from host (e.g. acme.yourdomain.com)
    const host = headerList.get("host") || "";
    const parts = host.split(".");
    if (parts.length >= 3 && !parts[0].startsWith("localhost")) {
      const subdomain = parts[0];
      if (db) {
        const found = await db
          .select()
          .from(schema.tenants)
          .where(eq(schema.tenants.slug, subdomain))
          .limit(1);
        if (found.length > 0) return found[0].id;
      }
    }
  } catch {
    // In contexts where cookies/headers are unavailable (e.g. static generation)
  }

  return ensureDefaultTenant();
}
