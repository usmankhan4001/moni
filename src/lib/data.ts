import { cache } from "react";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { getMonthRange } from "@/lib/date";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Account,
  AppSettings,
  Outsourcer,
  OutsourcerPayment,
  Project,
  Transaction,
} from "@/lib/database.types";

const DEFAULT_SETTINGS: AppSettings = {
  id: 1,
  exchange_rate: 284.5,
  pay_percentage: 70,
  default_tax_rate: 5,
  default_transfer_fee_rate: 2,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

export function isReady(): boolean {
  return isSupabaseConfigured();
}

async function client(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  return (await createServerSupabase()) as unknown as SupabaseClient;
}

type RawProject = Project & { outsourcer?: { name: string } | null };
type RawTransaction = Transaction & {
  account?: { name: string } | null;
  project?: { title: string } | null;
};
type RawPayment = OutsourcerPayment & { outsourcer?: { name: string } | null };

export interface ProjectWithRelations extends Project {
  outsourcer_name: string | null;
}

export interface TransactionWithRelations extends Transaction {
  account_name: string | null;
  project_title: string | null;
}

export interface PaymentWithOutsourcer extends OutsourcerPayment {
  outsourcer_name: string | null;
}

function mapProjectRow(p: RawProject): ProjectWithRelations {
  return { ...p, outsourcer_name: p.outsourcer?.name ?? null };
}

function mapTransactionRow(t: RawTransaction): TransactionWithRelations {
  return { ...t, account_name: t.account?.name ?? null, project_title: t.project?.title ?? null };
}

function mapPaymentRow(p: RawPayment): PaymentWithOutsourcer {
  return { ...p, outsourcer_name: p.outsourcer?.name ?? null };
}

/* --------------------------------- Settings ------------------------------- */

export const getSettings = cache(async (): Promise<AppSettings> => {
  const supabase = await client();
  if (!supabase) return DEFAULT_SETTINGS;
  const { data, error } = await supabase
    .from("app_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) return DEFAULT_SETTINGS;
  return (data ?? DEFAULT_SETTINGS) as AppSettings;
});

/* --------------------------------- Counts --------------------------------- */

export const getAccountCount = cache(async (): Promise<number> => {
  const supabase = await client();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("accounts")
    .select("*", { count: "exact", head: true });
  return error ? 0 : (count ?? 0);
});

export const getOutsourcerCount = cache(async (): Promise<number> => {
  const supabase = await client();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("outsourcers")
    .select("*", { count: "exact", head: true });
  return error ? 0 : (count ?? 0);
});

export const getProjectCount = cache(async (): Promise<number> => {
  const supabase = await client();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true });
  return error ? 0 : (count ?? 0);
});

/* -------------------------------- Accounts -------------------------------- */

export type AccountWithBalance = Account & { balance: number };

export const getAccounts = cache(async (): Promise<AccountWithBalance[]> => {
  const supabase = await client();
  if (!supabase) return [];

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return [];

  const balances = new Map<string, number>();
  for (const account of accounts as Account[]) {
    balances.set(account.id, 0);
  }

  const { data: txns } = await supabase.from("transactions").select("account_id, type, amount");
  for (const t of (txns ?? []) as Array<{
    account_id: string | null;
    type: "income" | "expense" | "fee";
    amount: number;
  }>) {
    if (!t.account_id || !balances.has(t.account_id)) continue;
    const sign = t.type === "income" ? 1 : -1;
    balances.set(t.account_id, (balances.get(t.account_id) ?? 0) + sign * t.amount);
  }

  return (accounts as Account[]).map((a) => ({ ...a, balance: balances.get(a.id) ?? 0 }));
});

export const getAccountsByCurrency = async (
  currency: "USD" | "PKR",
): Promise<AccountWithBalance[]> => {
  const all = await getAccounts();
  return all.filter((a) => a.currency === currency);
};

/* ------------------------------- Outsourcers ------------------------------ */

export const getOutsourcers = cache(async (): Promise<Outsourcer[]> => {
  const supabase = await client();
  if (!supabase) return [];
  const { data, error } = await supabase.from("outsourcers").select("*").order("name");
  return error ? [] : (data as Outsourcer[]);
});

/* -------------------------------- Projects -------------------------------- */

export const getProjects = cache(async (): Promise<ProjectWithRelations[]> => {
  const supabase = await client();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("projects")
    .select("*, outsourcer:outsourcers(name)")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map(mapProjectRow);
});

export const getProjectsByStatus = async (
  status: Project["status"],
): Promise<ProjectWithRelations[]> => {
  const supabase = await client();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("projects")
    .select("*, outsourcer:outsourcers(name)")
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map(mapProjectRow);
};

export const getProjectById = cache(async (id: string): Promise<Project | null> => {
  const supabase = await client();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return error ? null : (data as Project | null);
});

/* ------------------------------ Transactions ------------------------------ */

export const getTransactions = cache(
  async (month?: string | null): Promise<TransactionWithRelations[]> => {
    const supabase = await client();
    if (!supabase) return [];
    let query = supabase
      .from("transactions")
      .select("*, account:accounts(name), project:projects(title)")
      .order("transaction_date", { ascending: false });
    const range = month ? getMonthRange(month) : null;
    if (range) {
      query = query.gte("transaction_date", range.start).lt("transaction_date", range.end);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map(mapTransactionRow);
  },
);

/* -------------------------------- Payments -------------------------------- */

export const getPayments = cache(
  async (month?: string | null): Promise<PaymentWithOutsourcer[]> => {
    const supabase = await client();
    if (!supabase) return [];
    let query = supabase
      .from("outsourcer_payments")
      .select("*, outsourcer:outsourcers(name)")
      .order("due_date", { ascending: false });
    const range = month ? getMonthRange(month) : null;
    if (range) {
      query = query.gte("due_date", range.start).lt("due_date", range.end);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data ?? []).map(mapPaymentRow);
  },
);

export const getRecentTransactions = cache(
  async (limit = 5): Promise<TransactionWithRelations[]> => {
    const supabase = await client();
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("transactions")
      .select("*, account:accounts(name), project:projects(title)")
      .order("transaction_date", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []).map(mapTransactionRow);
  },
);

export const getPendingPaymentCount = cache(async (): Promise<number> => {
  const supabase = await client();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("outsourcer_payments")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  return error ? 0 : (count ?? 0);
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