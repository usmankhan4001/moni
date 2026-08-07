"use server";

import { revalidatePath } from "next/cache";
import { db, schema, isDatabaseConfigured } from "@/db";
import { eq, and } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";
import { calculateOutsourcerPayment } from "@/lib/payments";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function err(message: string): ActionResult {
  return { ok: false, message };
}

const NOT_CONNECTED = "Database isn't connected yet. Check process.env.DATABASE_URL.";

/* ------------------------------- Accounts ------------------------------ */

export async function createAccount(input: {
  name: string;
  currency: "USD" | "PKR";
}): Promise<ActionResult> {
  if (!isDatabaseConfigured() || !db) return err(NOT_CONNECTED);
  const tenantId = await getTenantId();

  try {
    await db.insert(schema.accounts).values({
      tenantId,
      name: input.name.trim(),
      currency: input.currency,
    });
    revalidatePath("/accounts");
    revalidatePath("/");
    return { ok: true, message: "Account created." };
  } catch (error) {
    console.error("createAccount error:", error);
    return err("Could not create account.");
  }
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  if (!isDatabaseConfigured() || !db) return err(NOT_CONNECTED);
  const tenantId = await getTenantId();

  try {
    await db
      .delete(schema.accounts)
      .where(and(eq(schema.accounts.id, id), eq(schema.accounts.tenantId, tenantId)));
    revalidatePath("/accounts");
    revalidatePath("/");
    return { ok: true, message: "Account deleted." };
  } catch (error) {
    console.error("deleteAccount error:", error);
    return err("Could not delete account.");
  }
}

/* ------------------------------ Outsourcers ---------------------------- */

export async function createOutsourcer(input: {
  name: string;
  taxRate: number;
  transferFeeRate: number;
}): Promise<ActionResult> {
  if (!isDatabaseConfigured() || !db) return err(NOT_CONNECTED);
  const tenantId = await getTenantId();

  try {
    await db.insert(schema.outsourcers).values({
      tenantId,
      name: input.name.trim(),
      taxRate: String(input.taxRate),
      transferFeeRate: String(input.transferFeeRate),
    });
    revalidatePath("/outsourcers");
    revalidatePath("/");
    return { ok: true, message: "Outsourcer added." };
  } catch (error) {
    console.error("createOutsourcer error:", error);
    return err("Could not add outsourcer.");
  }
}

export async function updateOutsourcer(
  id: string,
  input: { name?: string; taxRate?: number; transferFeeRate?: number }
): Promise<ActionResult> {
  if (!isDatabaseConfigured() || !db) return err(NOT_CONNECTED);
  const tenantId = await getTenantId();

  try {
    await db
      .update(schema.outsourcers)
      .set({
        ...(input.name ? { name: input.name.trim() } : {}),
        ...(input.taxRate != null ? { taxRate: String(input.taxRate) } : {}),
        ...(input.transferFeeRate != null ? { transferFeeRate: String(input.transferFeeRate) } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(schema.outsourcers.id, id), eq(schema.outsourcers.tenantId, tenantId)));
    revalidatePath("/outsourcers");
    return { ok: true, message: "Outsourcer updated." };
  } catch (error) {
    console.error("updateOutsourcer error:", error);
    return err("Could not update outsourcer.");
  }
}

export async function deleteOutsourcer(id: string): Promise<ActionResult> {
  if (!isDatabaseConfigured() || !db) return err(NOT_CONNECTED);
  const tenantId = await getTenantId();

  try {
    await db
      .delete(schema.outsourcers)
      .where(and(eq(schema.outsourcers.id, id), eq(schema.outsourcers.tenantId, tenantId)));
    revalidatePath("/outsourcers");
    revalidatePath("/");
    return { ok: true, message: "Outsourcer deleted." };
  } catch (error) {
    console.error("deleteOutsourcer error:", error);
    return err("Could not delete outsourcer. Remove its projects first.");
  }
}

/* ------------------------------- Projects ------------------------------ */

export async function createProject(input: {
  title: string;
  amountUsd: number;
  outsourcerId: string | null;
  status: "active" | "completed" | "cancelled";
}): Promise<ActionResult> {
  const amountUsd = Number(input.amountUsd);
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return err("Enter a positive project value.");
  if (!input.title.trim()) return err("Give the project a title.");

  if (!isDatabaseConfigured() || !db) return err(NOT_CONNECTED);
  const tenantId = await getTenantId();

  try {
    await db.insert(schema.projects).values({
      tenantId,
      title: input.title.trim(),
      amountUsd: String(amountUsd),
      outsourcerId: input.outsourcerId,
      status: input.status,
    });
    revalidatePath("/projects");
    revalidatePath("/");
    return { ok: true, message: "Project created." };
  } catch (error) {
    console.error("createProject error:", error);
    return err("Could not create project.");
  }
}

export async function updateProjectStatus(
  id: string,
  status: "active" | "completed" | "cancelled"
): Promise<ActionResult> {
  if (!isDatabaseConfigured() || !db) return err(NOT_CONNECTED);
  const tenantId = await getTenantId();

  try {
    await db
      .update(schema.projects)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(schema.projects.id, id), eq(schema.projects.tenantId, tenantId)));
    revalidatePath("/projects");
    revalidatePath("/");
    return { ok: true, message: "Project updated." };
  } catch (error) {
    console.error("updateProjectStatus error:", error);
    return err("Could not update project.");
  }
}

export async function deleteProject(id: string): Promise<ActionResult> {
  if (!isDatabaseConfigured() || !db) return err(NOT_CONNECTED);
  const tenantId = await getTenantId();

  try {
    await db
      .delete(schema.projects)
      .where(and(eq(schema.projects.id, id), eq(schema.projects.tenantId, tenantId)));
    revalidatePath("/projects");
    revalidatePath("/");
    return { ok: true, message: "Project deleted." };
  } catch (error) {
    console.error("deleteProject error:", error);
    return err("Could not delete project.");
  }
}

/* ----------------------------- Transactions ---------------------------- */

export async function createTransaction(input: {
  type: "income" | "expense" | "fee";
  description: string;
  amount: number;
  currency: "USD" | "PKR";
  project_id: string | null;
  account_id: string | null;
  transaction_date: string;
}): Promise<ActionResult> {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return err("Enter a positive amount.");
  if (!input.description.trim()) return err("Add a short description.");

  if (!isDatabaseConfigured() || !db) return err(NOT_CONNECTED);
  const tenantId = await getTenantId();

  if (input.account_id) {
    const [account] = await db
      .select({ currency: schema.accounts.currency })
      .from(schema.accounts)
      .where(and(eq(schema.accounts.id, input.account_id), eq(schema.accounts.tenantId, tenantId)))
      .limit(1);
    if (account && account.currency !== input.currency) {
      return err(
        `This account is in ${account.currency}; choose a matching currency or a different account.`
      );
    }
  }

  try {
    await db.insert(schema.transactions).values({
      tenantId,
      type: input.type,
      description: input.description.trim(),
      amount: String(amount),
      currency: input.currency,
      projectId: input.project_id,
      accountId: input.account_id,
      transactionDate: input.transaction_date ? new Date(input.transaction_date) : new Date(),
    });
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/");
    return { ok: true, message: "Transaction recorded." };
  } catch (error) {
    console.error("createTransaction error:", error);
    return err("Could not create transaction.");
  }
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  if (!isDatabaseConfigured() || !db) return err(NOT_CONNECTED);
  const tenantId = await getTenantId();

  try {
    await db
      .delete(schema.transactions)
      .where(and(eq(schema.transactions.id, id), eq(schema.transactions.tenantId, tenantId)));
    revalidatePath("/transactions");
    revalidatePath("/accounts");
    revalidatePath("/");
    return { ok: true, message: "Transaction deleted." };
  } catch (error) {
    console.error("deleteTransaction error:", error);
    return err("Could not delete transaction.");
  }
}

/* ------------------------- Outsourcer payments ------------------------- */

export async function generateMonthlyPayments(payload: {
  month: string; // YYYY-MM
  exchangeRate: number;
  payPercentage: number;
}): Promise<ActionResult> {
  const { month, exchangeRate, payPercentage } = payload;
  if (!/^\d{4}-\d{2}$/.test(month)) return err("Invalid month.");
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) return err("Invalid exchange rate.");
  if (!Number.isFinite(payPercentage) || payPercentage < 0 || payPercentage > 100)
    return err("Pay percentage must be between 0 and 100.");

  if (!isDatabaseConfigured() || !db) return err(NOT_CONNECTED);
  const tenantId = await getTenantId();

  try {
    const outs = await db
      .select()
      .from(schema.outsourcers)
      .where(eq(schema.outsourcers.tenantId, tenantId));
    if (outs.length === 0) return err("Add an outsourcer first.");

    const projs = await db
      .select()
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.tenantId, tenantId),
          eq(schema.projects.status, "completed")
        )
      );

    const byOutsourcer = new Map<string, { title: string; amount: number }[]>();
    for (const p of projs) {
      if (!p.outsourcerId) continue;
      const list = byOutsourcer.get(p.outsourcerId) ?? [];
      list.push({ title: p.title, amount: Number(p.amountUsd) });
      byOutsourcer.set(p.outsourcerId, list);
    }

    if (byOutsourcer.size === 0)
      return err("No completed projects are assigned to an outsourcer yet.");

    const dueDate = `${month}-01`;
    let countGenerated = 0;

    for (const [outsId, projectList] of byOutsourcer) {
      const os = outs.find((o) => o.id === outsId);
      const gross = projectList.reduce((sum, p) => sum + p.amount, 0);
      const taxRate = os ? Number(os.taxRate) : 5;
      const feeRate = os ? Number(os.transferFeeRate) : 2;

      const calc = calculateOutsourcerPayment(gross, {
        taxRate,
        transferFeeRate: feeRate,
        exchangeRate,
        payPercentage,
      });

      await db
        .insert(schema.outsourcerPayments)
        .values({
          tenantId,
          outsourcerId: outsId,
          month: dueDate,
          grossUsd: String(calc.grossUsd),
          taxRate: String(taxRate),
          taxUsd: String(calc.taxUsd),
          transferFeeRate: String(feeRate),
          transferFeeUsd: String(calc.transferFeeUsd),
          netUsd: String(calc.netUsd),
          exchangeRate: String(exchangeRate),
          netPkr: String(calc.netPkr),
          status: "pending",
          dueDate: dueDate,
        })
        .onConflictDoUpdate({
          target: [schema.outsourcerPayments.tenantId, schema.outsourcerPayments.outsourcerId, schema.outsourcerPayments.month],
          set: {
            grossUsd: String(calc.grossUsd),
            taxRate: String(taxRate),
            taxUsd: String(calc.taxUsd),
            transferFeeRate: String(feeRate),
            transferFeeUsd: String(calc.transferFeeUsd),
            netUsd: String(calc.netUsd),
            exchangeRate: String(exchangeRate),
            netPkr: String(calc.netPkr),
            updatedAt: new Date(),
          },
        });

      countGenerated++;
    }

    revalidatePath("/payments");
    revalidatePath("/");
    return { ok: true, message: `Generated ${countGenerated} payment${countGenerated === 1 ? "" : "s"} for ${month}.` };
  } catch (error) {
    console.error("generateMonthlyPayments error:", error);
    return err("Could not generate payments.");
  }
}

export async function markPaymentPaid(id: string): Promise<ActionResult> {
  if (!isDatabaseConfigured() || !db) return err(NOT_CONNECTED);
  const tenantId = await getTenantId();

  try {
    await db
      .update(schema.outsourcerPayments)
      .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.outsourcerPayments.id, id), eq(schema.outsourcerPayments.tenantId, tenantId)));
    revalidatePath("/payments");
    revalidatePath("/");
    return { ok: true, message: "Payment marked as paid." };
  } catch (error) {
    console.error("markPaymentPaid error:", error);
    return err("Could not mark payment as paid.");
  }
}

export async function deletePayment(id: string): Promise<ActionResult> {
  if (!isDatabaseConfigured() || !db) return err(NOT_CONNECTED);
  const tenantId = await getTenantId();

  try {
    await db
      .delete(schema.outsourcerPayments)
      .where(and(eq(schema.outsourcerPayments.id, id), eq(schema.outsourcerPayments.tenantId, tenantId)));
    revalidatePath("/payments");
    return { ok: true, message: "Payment deleted." };
  } catch (error) {
    console.error("deletePayment error:", error);
    return err("Could not delete payment.");
  }
}

/* -------------------------------- Settings ------------------------------ */

export async function updateSettings(input: {
  exchange_rate: number;
  pay_percentage: number;
  default_tax_rate: number;
  default_transfer_fee_rate: number;
}): Promise<ActionResult> {
  const values = {
    exchangeRate: String(input.exchange_rate),
    payPercentage: String(input.pay_percentage),
    defaultTaxRate: String(input.default_tax_rate),
    defaultTransferFeeRate: String(input.default_transfer_fee_rate),
  };

  if (!isDatabaseConfigured() || !db) return err(NOT_CONNECTED);
  const tenantId = await getTenantId();

  try {
    const existing = await db
      .select()
      .from(schema.appSettings)
      .where(eq(schema.appSettings.tenantId, tenantId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(schema.appSettings)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(schema.appSettings.tenantId, tenantId));
    } else {
      await db.insert(schema.appSettings).values({
        tenantId,
        ...values,
      });
    }

    revalidatePath("/");
    revalidatePath("/payments");
    return { ok: true, message: "Settings saved." };
  } catch (error) {
    console.error("updateSettings error:", error);
    return err("Could not save settings.");
  }
}
