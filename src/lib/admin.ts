import { redirect } from "next/navigation";
import { eq, count } from "drizzle-orm";
import { db, schema, isDatabaseConfigured } from "@/db";
import { getSession } from "@/lib/auth";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Gates access to the operator admin view. Redirects home (never throws) if
 * there's no session or the session's email isn't in the ADMIN_EMAILS
 * allowlist. Call this first, before any admin-only query, in every
 * admin route.
 */
export async function requireAdmin(): Promise<{ userId: string; email: string }> {
  const session = await getSession();
  const adminEmails = getAdminEmails();

  if (!session || adminEmails.length === 0 || !adminEmails.includes(session.email.toLowerCase())) {
    redirect("/");
  }

  return { userId: session.userId, email: session.email };
}

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  accountCount: number;
  projectCount: number;
  transactionCount: number;
};

/**
 * SUPERADMIN-ONLY QUERY — intentionally bypasses normal tenant scoping to
 * read a summary of every tenant in the system. This is the one deliberate
 * exception to the rule that every query must be scoped to the caller's own
 * tenantId via getTenantId() (src/lib/tenant.ts). It is only reachable
 * through src/app/admin/page.tsx, which calls requireAdmin() first — do not
 * reuse this cross-tenant pattern anywhere else in the app.
 *
 * Kept intentionally simple (a query per tenant) rather than one optimized
 * grouped join — v1 doesn't need to scale to huge tenant counts.
 */
export async function listAllTenants(): Promise<TenantSummary[]> {
  if (!isDatabaseConfigured() || !db) return [];

  const tenants = await db.select().from(schema.tenants);

  const summaries: TenantSummary[] = [];
  for (const tenant of tenants) {
    const [accountsRes, projectsRes, transactionsRes] = await Promise.all([
      db.select({ val: count() }).from(schema.accounts).where(eq(schema.accounts.tenantId, tenant.id)),
      db.select({ val: count() }).from(schema.projects).where(eq(schema.projects.tenantId, tenant.id)),
      db.select({ val: count() }).from(schema.transactions).where(eq(schema.transactions.tenantId, tenant.id)),
    ]);

    summaries.push({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: tenant.createdAt,
      accountCount: Number(accountsRes[0]?.val ?? 0),
      projectCount: Number(projectsRes[0]?.val ?? 0),
      transactionCount: Number(transactionsRes[0]?.val ?? 0),
    });
  }

  return summaries;
}
