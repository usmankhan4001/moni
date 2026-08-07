import { cache } from "react";
import { db, schema, isDatabaseConfigured } from "@/db";
import { eq, and, gte, lt, desc, count, sum } from "drizzle-orm";
import { getTenantId } from "@/lib/tenant";
import { getMonthRange } from "@/lib/date";

export interface AppSettings {
  id: string;
  tenant_id: string;
  exchange_rate: number;
  pay_percentage: number;
  default_tax_rate: number;
  default_transfer_fee_rate: number;
  created_at?: string;
  updated_at?: string;
}

export interface AccountWithBalance {
  id: string;
  tenant_id: string;
  name: string;
  currency: "USD" | "PKR";
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface Outsourcer {
  id: string;
  tenant_id: string;
  name: string;
  tax_rate: number;
  transfer_fee_rate: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithRelations {
  id: string;
  tenant_id: string;
  title: string;
  amount_usd: number;
  outsourcer_id: string | null;
  outsourcer_name: string | null;
  status: "active" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface TransactionWithRelations {
  id: string;
  tenant_id: string;
  type: "income" | "expense" | "fee";
  description: string;
  amount: number;
  currency: "USD" | "PKR";
  project_id: string | null;
  account_id: string | null;
  account_name: string | null;
  project_title: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentWithOutsourcer {
  id: string;
  tenant_id: string;
  outsourcer_id: string;
  outsourcer_name: string | null;
  month: string;
  gross_usd: number;
  tax_rate: number;
  tax_usd: number;
  transfer_fee_rate: number;
  transfer_fee_usd: number;
  net_usd: number;
  exchange_rate: number;
  net_pkr: number;
  status: "pending" | "paid";
  due_date: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  id: "default",
  tenant_id: "00000000-0000-0000-0000-000000000001",
  exchange_rate: 284.5,
  pay_percentage: 70,
  default_tax_rate: 5,
  default_transfer_fee_rate: 2,
};

export function isReady(): boolean {
  return isDatabaseConfigured();
}

/* --------------------------------- Settings ------------------------------- */

export const getSettings = cache(async (): Promise<AppSettings> => {
  if (!isDatabaseConfigured() || !db) return DEFAULT_SETTINGS;
  const tenantId = await getTenantId();

  try {
    const rows = await db
      .select()
      .from(schema.appSettings)
      .where(eq(schema.appSettings.tenantId, tenantId))
      .limit(1);

    if (rows.length === 0) return { ...DEFAULT_SETTINGS, tenant_id: tenantId };

    const r = rows[0];
    return {
      id: r.id,
      tenant_id: r.tenantId,
      exchange_rate: Number(r.exchangeRate),
      pay_percentage: Number(r.payPercentage),
      default_tax_rate: Number(r.defaultTaxRate),
      default_transfer_fee_rate: Number(r.defaultTransferFeeRate),
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    };
  } catch (err) {
    console.error("Error getting settings:", err);
    return DEFAULT_SETTINGS;
  }
});

/* --------------------------------- Counts --------------------------------- */

export const getAccountCount = cache(async (): Promise<number> => {
  if (!isDatabaseConfigured() || !db) return 0;
  const tenantId = await getTenantId();
  try {
    const res = await db
      .select({ val: count() })
      .from(schema.accounts)
      .where(eq(schema.accounts.tenantId, tenantId));
    return Number(res[0]?.val ?? 0);
  } catch {
    return 0;
  }
});

export const getOutsourcerCount = cache(async (): Promise<number> => {
  if (!isDatabaseConfigured() || !db) return 0;
  const tenantId = await getTenantId();
  try {
    const res = await db
      .select({ val: count() })
      .from(schema.outsourcers)
      .where(eq(schema.outsourcers.tenantId, tenantId));
    return Number(res[0]?.val ?? 0);
  } catch {
    return 0;
  }
});

export const getProjectCount = cache(async (): Promise<number> => {
  if (!isDatabaseConfigured() || !db) return 0;
  const tenantId = await getTenantId();
  try {
    const res = await db
      .select({ val: count() })
      .from(schema.projects)
      .where(eq(schema.projects.tenantId, tenantId));
    return Number(res[0]?.val ?? 0);
  } catch {
    return 0;
  }
});

/* -------------------------------- Accounts -------------------------------- */

export const getAccounts = cache(async (): Promise<AccountWithBalance[]> => {
  if (!isDatabaseConfigured() || !db) return [];
  const tenantId = await getTenantId();

  try {
    const accList = await db
      .select()
      .from(schema.accounts)
      .where(eq(schema.accounts.tenantId, tenantId));

    const txns = await db
      .select({
        accountId: schema.transactions.accountId,
        type: schema.transactions.type,
        amount: schema.transactions.amount,
      })
      .from(schema.transactions)
      .where(eq(schema.transactions.tenantId, tenantId));

    const balances = new Map<string, number>();
    for (const a of accList) {
      balances.set(a.id, 0);
    }

    for (const t of txns) {
      if (!t.accountId || !balances.has(t.accountId)) continue;
      const amt = Number(t.amount);
      const sign = t.type === "income" ? 1 : -1;
      balances.set(t.accountId, (balances.get(t.accountId) ?? 0) + sign * amt);
    }

    return accList.map((a) => ({
      id: a.id,
      tenant_id: a.tenantId,
      name: a.name,
      currency: a.currency as "USD" | "PKR",
      balance: balances.get(a.id) ?? 0,
      created_at: a.createdAt.toISOString(),
      updated_at: a.updatedAt.toISOString(),
    }));
  } catch (err) {
    console.error("Error getting accounts:", err);
    return [];
  }
});

export const getAccountsByCurrency = async (
  currency: "USD" | "PKR",
): Promise<AccountWithBalance[]> => {
  const all = await getAccounts();
  return all.filter((a) => a.currency === currency);
};

/* ------------------------------- Outsourcers ------------------------------ */

export const getOutsourcers = cache(async (): Promise<Outsourcer[]> => {
  if (!isDatabaseConfigured() || !db) return [];
  const tenantId = await getTenantId();

  try {
    const rows = await db
      .select()
      .from(schema.outsourcers)
      .where(eq(schema.outsourcers.tenantId, tenantId))
      .orderBy(schema.outsourcers.name);

    return rows.map((r) => ({
      id: r.id,
      tenant_id: r.tenantId,
      name: r.name,
      tax_rate: Number(r.taxRate),
      transfer_fee_rate: Number(r.transferFeeRate),
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
});

/* -------------------------------- Projects -------------------------------- */

export const getProjects = cache(async (): Promise<ProjectWithRelations[]> => {
  if (!isDatabaseConfigured() || !db) return [];
  const tenantId = await getTenantId();

  try {
    const rows = await db
      .select({
        project: schema.projects,
        outsourcerName: schema.outsourcers.name,
      })
      .from(schema.projects)
      .leftJoin(
        schema.outsourcers,
        eq(schema.projects.outsourcerId, schema.outsourcers.id)
      )
      .where(eq(schema.projects.tenantId, tenantId))
      .orderBy(desc(schema.projects.createdAt));

    return rows.map(({ project, outsourcerName }) => ({
      id: project.id,
      tenant_id: project.tenantId,
      title: project.title,
      amount_usd: Number(project.amountUsd),
      outsourcer_id: project.outsourcerId,
      outsourcer_name: outsourcerName ?? null,
      status: project.status as "active" | "completed" | "cancelled",
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
});

export const getProjectsByStatus = async (
  status: "active" | "completed" | "cancelled",
): Promise<ProjectWithRelations[]> => {
  const all = await getProjects();
  return all.filter((p) => p.status === status);
};

/* ------------------------------ Transactions ------------------------------ */

export const getTransactions = cache(
  async (
    month?: string | null,
    opts?: { limit?: number; offset?: number }
  ): Promise<TransactionWithRelations[]> => {
    if (!isDatabaseConfigured() || !db) return [];
    const tenantId = await getTenantId();

    try {
      const conditions = [eq(schema.transactions.tenantId, tenantId)];
      const range = month ? getMonthRange(month) : null;
      if (range) {
        conditions.push(gte(schema.transactions.transactionDate, new Date(range.start)));
        conditions.push(lt(schema.transactions.transactionDate, new Date(range.end)));
      }

      let query = db
        .select({
          txn: schema.transactions,
          accountName: schema.accounts.name,
          projectTitle: schema.projects.title,
        })
        .from(schema.transactions)
        .leftJoin(schema.accounts, eq(schema.transactions.accountId, schema.accounts.id))
        .leftJoin(schema.projects, eq(schema.transactions.projectId, schema.projects.id))
        .where(and(...conditions))
        .orderBy(desc(schema.transactions.transactionDate))
        .$dynamic();

      if (opts?.limit !== undefined) query = query.limit(opts.limit);
      if (opts?.offset !== undefined) query = query.offset(opts.offset);

      const rows = await query;

      return rows.map(({ txn, accountName, projectTitle }) => ({
        id: txn.id,
        tenant_id: txn.tenantId,
        type: txn.type as "income" | "expense" | "fee",
        description: txn.description,
        amount: Number(txn.amount),
        currency: txn.currency as "USD" | "PKR",
        project_id: txn.projectId,
        account_id: txn.accountId,
        account_name: accountName ?? null,
        project_title: projectTitle ?? null,
        transaction_date: txn.transactionDate.toISOString(),
        created_at: txn.createdAt.toISOString(),
        updated_at: txn.updatedAt.toISOString(),
      }));
    } catch {
      return [];
    }
  }
);

export const getRecentTransactions = cache(
  async (limit = 5): Promise<TransactionWithRelations[]> => {
    const all = await getTransactions(null, { limit });
    return all.slice(0, limit);
  }
);

export interface TransactionTotals {
  income_usd: number;
  expense_usd: number;
  fee_usd: number;
}

// Ledger-wide totals via SQL aggregation instead of fetching every row into JS.
export const getTransactionTotals = cache(async (): Promise<TransactionTotals> => {
  const zero = { income_usd: 0, expense_usd: 0, fee_usd: 0 };
  if (!isDatabaseConfigured() || !db) return zero;
  const tenantId = await getTenantId();

  try {
    const [rows, settings] = await Promise.all([
      db
        .select({
          type: schema.transactions.type,
          currency: schema.transactions.currency,
          total: sum(schema.transactions.amount),
        })
        .from(schema.transactions)
        .where(eq(schema.transactions.tenantId, tenantId))
        .groupBy(schema.transactions.type, schema.transactions.currency),
      getSettings(),
    ]);

    const rate = settings.exchange_rate;
    let income_usd = 0;
    let expense_usd = 0;
    let fee_usd = 0;
    for (const r of rows) {
      const amt = Number(r.total) || 0;
      const usd = r.currency === "USD" ? amt : amt / rate;
      if (r.type === "income") income_usd += usd;
      else if (r.type === "expense") expense_usd += usd;
      else fee_usd += usd;
    }
    return { income_usd, expense_usd, fee_usd };
  } catch (err) {
    console.error("Error getting transaction totals:", err);
    return zero;
  }
});

/* -------------------------------- Payments -------------------------------- */

export const getPayments = cache(
  async (month?: string | null): Promise<PaymentWithOutsourcer[]> => {
    if (!isDatabaseConfigured() || !db) return [];
    const tenantId = await getTenantId();

    try {
      const conditions = [eq(schema.outsourcerPayments.tenantId, tenantId)];
      const range = month ? getMonthRange(month) : null;
      if (range) {
        conditions.push(gte(schema.outsourcerPayments.dueDate, range.start));
        conditions.push(lt(schema.outsourcerPayments.dueDate, range.end));
      }

      const rows = await db
        .select({
          payment: schema.outsourcerPayments,
          outsourcerName: schema.outsourcers.name,
        })
        .from(schema.outsourcerPayments)
        .leftJoin(
          schema.outsourcers,
          eq(schema.outsourcerPayments.outsourcerId, schema.outsourcers.id)
        )
        .where(and(...conditions))
        .orderBy(desc(schema.outsourcerPayments.dueDate));

      return rows.map(({ payment, outsourcerName }) => ({
        id: payment.id,
        tenant_id: payment.tenantId,
        outsourcer_id: payment.outsourcerId,
        outsourcer_name: outsourcerName ?? null,
        month: payment.month,
        gross_usd: Number(payment.grossUsd),
        tax_rate: Number(payment.taxRate),
        tax_usd: Number(payment.taxUsd),
        transfer_fee_rate: Number(payment.transferFeeRate),
        transfer_fee_usd: Number(payment.transferFeeUsd),
        net_usd: Number(payment.netUsd),
        exchange_rate: Number(payment.exchangeRate),
        net_pkr: Number(payment.netPkr),
        status: payment.status as "pending" | "paid",
        due_date: payment.dueDate,
        paid_at: payment.paidAt ? payment.paidAt.toISOString() : null,
        created_at: payment.createdAt.toISOString(),
        updated_at: payment.updatedAt.toISOString(),
      }));
    } catch {
      return [];
    }
  }
);

export const getPendingPaymentCount = cache(async (): Promise<number> => {
  const payments = await getPayments();
  return payments.filter((p) => p.status === "pending").length;
});

/* -------------------------------- Dashboard ------------------------------- */

export interface DashboardData {
  accounts: AccountWithBalance[];
  outsourcers: Outsourcer[];
  projects: ProjectWithRelations[];
  transactions: TransactionWithRelations[];
  recent: TransactionWithRelations[];
  settings: AppSettings;
}

export const getDashboardData = async (): Promise<DashboardData> => {
  const [accounts, outsourcers, projects, transactions, recent, settings] = await Promise.all([
    getAccounts(),
    getOutsourcers(),
    getProjects(),
    getTransactions(),
    getRecentTransactions(5),
    getSettings(),
  ]);
  return { accounts, outsourcers, projects, transactions, recent, settings };
};
