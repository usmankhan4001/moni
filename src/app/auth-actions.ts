"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema, isDatabaseConfigured } from "@/db";
import { getDeploymentMode, ensureMigrations } from "@/lib/tenant";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function err(message: string): ActionResult {
  return { ok: false, message };
}

const NOT_CONNECTED = "Database isn't connected yet. Check process.env.DATABASE_URL.";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_SIGNIN_ERROR = "Invalid email or password.";

const DEFAULT_APP_SETTINGS = {
  exchangeRate: "284.50",
  payPercentage: "70.00",
  defaultTaxRate: "5.00",
  defaultTransferFeeRate: "2.00",
};

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "workspace";
}

function randomSuffix(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 6);
}

/* --------------------------------- Sign up ------------------------------- */

export async function signUp(input: {
  workspaceName: string;
  email: string;
  password: string;
}): Promise<ActionResult> {
  if (getDeploymentMode() !== "multi_tenant") {
    return err("Sign-up is only available in multi-tenant deployments.");
  }
  if (!isDatabaseConfigured() || !db) return err(NOT_CONNECTED);

  // On a brand-new multi_tenant database this is the ONLY thing that can
  // create the schema. ensureMigrations() otherwise runs solely from
  // getTenantId(), which requires a verified session — and you cannot obtain
  // a session without first signing up, which needs these very tables. That
  // circular dependency left a fresh deployment permanently unable to
  // migrate, with signup failing on `relation "users" does not exist`.
  // /api/health does not catch it because it only issues `select 1`.
  await ensureMigrations();

  const ip = await getClientIp();
  const limited = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
  if (!limited.ok) {
    return err("Too many sign-up attempts. Please try again later.");
  }

  const workspaceName = input.workspaceName.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!workspaceName) return err("Give your workspace a name.");
  if (!EMAIL_RE.test(email)) return err("Enter a valid email address.");
  if (password.length < 8) return err("Password must be at least 8 characters.");

  try {
    const existingUser = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    if (existingUser.length > 0) {
      return err("An account with this email already exists.");
    }

    const baseSlug = slugify(workspaceName);
    let slug = baseSlug;
    let slugAvailable = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      const existingTenant = await db
        .select({ id: schema.tenants.id })
        .from(schema.tenants)
        .where(eq(schema.tenants.slug, slug))
        .limit(1);
      if (existingTenant.length === 0) {
        slugAvailable = true;
        break;
      }
      slug = `${baseSlug}-${randomSuffix()}`;
    }
    if (!slugAvailable) {
      return err("Could not create a unique workspace identifier. Try a different name.");
    }

    const passwordHash = await hashPassword(password);

    const session = await db.transaction(async (tx) => {
      const [tenant] = await tx
        .insert(schema.tenants)
        .values({ name: workspaceName, slug, plan: "pro" })
        .returning({ id: schema.tenants.id });

      const [user] = await tx
        .insert(schema.users)
        .values({ email, name: null, passwordHash })
        .returning({ id: schema.users.id });

      await tx.insert(schema.memberships).values({
        userId: user.id,
        tenantId: tenant.id,
        role: "owner",
      });

      await tx.insert(schema.appSettings).values({
        tenantId: tenant.id,
        ...DEFAULT_APP_SETTINGS,
      });

      return { userId: user.id, tenantId: tenant.id, email };
    });

    await createSession(session);
  } catch (error) {
    console.error("signUp error:", error);
    return err("Could not create your workspace. Please try again.");
  }

  redirect("/");
}

/* --------------------------------- Sign in ------------------------------- */

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<ActionResult> {
  if (getDeploymentMode() !== "multi_tenant") {
    return err("Sign-in is only available in multi-tenant deployments.");
  }
  if (!isDatabaseConfigured() || !db) return err(NOT_CONNECTED);

  // Same reasoning as signUp: a fresh deployment whose first visitor lands on
  // /login rather than /signup would otherwise query tables that don't exist.
  await ensureMigrations();

  const email = input.email.trim().toLowerCase();
  const password = input.password;

  const ip = await getClientIp();
  const limited = rateLimit(`signin:${ip}:${email}`, 5, 15 * 60 * 1000);
  if (!limited.ok) {
    return err("Too many sign-in attempts. Please try again later.");
  }

  try {
    const found = await db
      .select({ id: schema.users.id, passwordHash: schema.users.passwordHash })
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    const user = found[0];
    if (!user || !user.passwordHash) {
      return err(GENERIC_SIGNIN_ERROR);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return err(GENERIC_SIGNIN_ERROR);
    }

    const memberships = await db
      .select({ tenantId: schema.memberships.tenantId })
      .from(schema.memberships)
      .where(eq(schema.memberships.userId, user.id))
      .orderBy(schema.memberships.createdAt)
      .limit(1);

    const membership = memberships[0];
    if (!membership) {
      return err("No workspace found for this account.");
    }

    await createSession({ userId: user.id, tenantId: membership.tenantId, email });
  } catch (error) {
    console.error("signIn error:", error);
    return err("Could not sign you in. Please try again.");
  }

  redirect("/");
}

/* --------------------------------- Sign out ------------------------------ */

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/login");
}
