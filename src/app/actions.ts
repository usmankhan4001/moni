"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { calculateOutsourcerPayment } from "@/lib/payments";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

function err(message: string): ActionResult {
  return { ok: false, message };
}

async function db(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  return (await createServerSupabase()) as unknown as SupabaseClient;
}

const NOT_CONNECTED =
  "Database isn't connected yet. Add Supabase credentials to get started.";

/* ------------------------------- Accounts ------------------------------ */

export async function createAccount(input: {
  name: string;
  currency: "USD" | "PKR";
}): Promise<ActionResult> {
  const supabase = await db();
  if (!supabase) return err(NOT_CONNECTED);
  const { error } = await supabase
    .from("accounts")
    .insert({ name: input.name.trim(), currency: input.currency });
  if (error) return err("Could not create account.");
  revalidatePath("/accounts");
  revalidatePath("/");
  return { ok: true, message: "Account created." };
}

export async function deleteAccount(id: string): Promise<ActionResult> {
  const supabase = await db();
  if (!supabase) return err(NOT_CONNECTED);
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) return err("Could not delete account.");
  revalidatePath("/accounts");
  revalidatePath("/");
  return { ok: true, message: "Account deleted." };
}

/* ------------------------------ Outsourcers ---------------------------- */

export async function createOutsourcer(input: {
  name: string;
  taxRate: number;
  transferFeeRate: number;
}): Promise<ActionResult> {
  const supabase = await db();
  if (!supabase) return err(NOT_CONNECTED);
  const { error } = await supabase.from("outsourcers").insert({
    name: input.name.trim(),
    tax_rate: input.taxRate,
    transfer_fee_rate: input.transferFeeRate,
  });
  if (error)
    return err(
      String(error.message).includes("duplicate")
        ? "That outsourcer already exists."
        : "Could not add outsourcer.",
    );
  revalidatePath("/outsourcers");
  revalidatePath("/");
  return { ok: true, message: "Outsourcer added." };
}

export async function updateOutsourcer(
  id: string,
  input: { name?: string; taxRate?: number; transferFeeRate?: number },
): Promise<ActionResult> {
  const supabase = await db();
  if (!supabase) return err(NOT_CONNECTED);
  const { error } = await supabase
    .from("outsourcers")
    .update({
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.taxRate != null ? { tax_rate: input.taxRate } : {}),
      ...(input.transferFeeRate != null ? { transfer_fee_rate: input.transferFeeRate } : {}),
    })
    .eq("id", id);
  if (error) return err("Could not update outsourcer.");
  revalidatePath("/outsourcers");
  return { ok: true, message: "Outsourcer updated." };
}

export async function deleteOutsourcer(id: string): Promise<ActionResult> {
  const supabase = await db();
  if (!supabase) return err(NOT_CONNECTED);
  const { error } = await supabase.from("outsourcers").delete().eq("id", id);
  if (error) return err("Could not delete outsourcer. Remove its projects first.");
  revalidatePath("/outsourcers");
  revalidatePath("/");
  return { ok: true, message: "Outsourcer deleted." };
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
  const supabase = await db();
  if (!supabase) return err(NOT_CONNECTED);
  const { error } = await supabase.from("projects").insert({
    title: input.title.trim(),
    amount_usd: amountUsd,
    outsourcer_id: input.outsourcerId,
    status: input.status,
  });
  if (error) return err("Could not create project.");
  revalidatePath("/projects");
  revalidatePath("/");
  return { ok: true, message: "Project created." };
}

export async function updateProjectStatus(
  id: string,
  status: "active" | "completed" | "cancelled",
): Promise<ActionResult> {
  const supabase = await db();
  if (!supabase) return err(NOT_CONNECTED);
  const { error } = await supabase.from("projects").update({ status }).eq("id", id);
  if (error) return err("Could not update project.");
  revalidatePath("/projects");
  revalidatePath("/");
  return { ok: true, message: "Project updated." };
}

export async function deleteProject(id: string): Promise<ActionResult> {
  const supabase = await db();
  if (!supabase) return err(NOT_CONNECTED);
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) return err("Could not delete project.");
  revalidatePath("/projects");
  revalidatePath("/");
  return { ok: true, message: "Project deleted." };
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
  const supabase = await db();
  if (!supabase) return err(NOT_CONNECTED);
  const { error } = await supabase.from("transactions").insert({
    type: input.type,
    description: input.description.trim(),
    amount,
    currency: input.currency,
    project_id: input.project_id,
    account_id: input.account_id,
    transaction_date: input.transaction_date
      ? new Date(input.transaction_date).toISOString()
      : new Date().toISOString(),
  });
  if (error) return err("Could not create transaction.");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/");
  return { ok: true, message: "Transaction recorded." };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await db();
  if (!supabase) return err(NOT_CONNECTED);
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return err("Could not delete transaction.");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/");
  return { ok: true, message: "Transaction deleted." };
}

/* ------------------------- Outsourcer payments ------------------------- */

export async function generateMonthlyPayments(payload: {
  month: string; // YYYY-MM (due on the 1st)
  exchangeRate: number;
  payPercentage: number;
}): Promise<ActionResult> {
  const { month, exchangeRate, payPercentage } = payload;
  if (!/^\d{4}-\d{2}$/.test(month)) return err("Invalid month.");
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) return err("Invalid exchange rate.");
  if (!Number.isFinite(payPercentage) || payPercentage < 0 || payPercentage > 100)
    return err("Pay percentage must be between 0 and 100.");

  const supabase = await db();
  if (!supabase) return err(NOT_CONNECTED);

  const { data: outsourcers } = await supabase.from("outsourcers").select("*");
  const outs = (outsourcers ?? []) as Array<{ id: string; tax_rate: number; transfer_fee_rate: number }>;
  if (outs.length === 0) return err("Add an outsourcer first.");

  const { data: projects } = await supabase
    .from("projects")
    .select("title, amount_usd, outsourcer_id")
    .eq("status", "completed");
  const projs = (projects ?? []) as Array<{ title: string; amount_usd: number; outsourcer_id: string | null }>;

  const byOutsourcer = new Map<string, { title: string; amount: number }[]>();
  for (const p of projs) {
    if (!p.outsourcer_id) continue;
    const list = byOutsourcer.get(p.outsourcer_id) ?? [];
    list.push({ title: p.title, amount: Number(p.amount_usd) });
    byOutsourcer.set(p.outsourcer_id, list);
  }
  if (byOutsourcer.size === 0)
    return err("No completed projects are assigned to an outsourcer yet.");

  const dueDate = `${month}-01`;
  const rows = [];
  for (const [outsId, projectList] of byOutsourcer) {
    const os = outs.find((o) => o.id === outsId);
    const gross = projectList.reduce((sum, p) => sum + p.amount, 0);
    const taxRate = os ? Number(os.tax_rate) : 5;
    const feeRate = os ? Number(os.transfer_fee_rate) : 2;
    const calc = calculateOutsourcerPayment(gross, {
      taxRate,
      transferFeeRate: feeRate,
      exchangeRate,
      payPercentage,
    });
    rows.push({
      outsourcer_id: outsId,
      month: dueDate,
      gross_usd: calc.grossUsd,
      tax_rate: taxRate,
      tax_usd: calc.taxUsd,
      transfer_fee_rate: feeRate,
      transfer_fee_usd: calc.transferFeeUsd,
      net_usd: calc.netUsd,
      exchange_rate: exchangeRate,
      net_pkr: calc.netPkr,
      status: "pending",
      due_date: dueDate,
      paid_at: null,
    });
  }

  const { error } = await supabase.from("outsourcer_payments").upsert(rows, {
    onConflict: "outsourcer_id,month",
  });
  if (error) return err("Could not generate payments.");
  revalidatePath("/payments");
  revalidatePath("/");
  return { ok: true, message: `Generated ${rows.length} payment${rows.length === 1 ? "" : "s"} for ${month}.` };
}

export async function markPaymentPaid(id: string): Promise<ActionResult> {
  const supabase = await db();
  if (!supabase) return err(NOT_CONNECTED);
  const { error } = await supabase
    .from("outsourcer_payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return err("Could not mark payment as paid.");
  revalidatePath("/payments");
  revalidatePath("/");
  return { ok: true, message: "Payment marked as paid." };
}

export async function deletePayment(id: string): Promise<ActionResult> {
  const supabase = await db();
  if (!supabase) return err(NOT_CONNECTED);
  const { error } = await supabase.from("outsourcer_payments").delete().eq("id", id);
  if (error) return err("Could not delete payment.");
  revalidatePath("/payments");
  return { ok: true, message: "Payment deleted." };
}

/* -------------------------------- Settings ------------------------------ */

export async function updateSettings(input: {
  exchange_rate: number;
  pay_percentage: number;
  default_tax_rate: number;
  default_transfer_fee_rate: number;
}): Promise<ActionResult> {
  const values = {
    exchange_rate: Number(input.exchange_rate),
    pay_percentage: Number(input.pay_percentage),
    default_tax_rate: Number(input.default_tax_rate),
    default_transfer_fee_rate: Number(input.default_transfer_fee_rate),
  };
  if (!Number.isFinite(values.exchange_rate) || values.exchange_rate <= 0)
    return err("Check the exchange rate.");
  if (values.pay_percentage < 0 || values.pay_percentage > 100)
    return err("Pay percentage must be between 0 and 100.");
  const supabase = await db();
  if (!supabase) return err(NOT_CONNECTED);
  const { data: existing } = await supabase
    .from("app_settings")
    .select("id")
    .eq("id", 1)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from("app_settings").update(values).eq("id", 1)
    : await supabase.from("app_settings").insert({ id: 1, ...values });
  if (error) return err("Could not save settings.");
  revalidatePath("/");
  revalidatePath("/payments");
  return { ok: true, message: "Settings saved." };
}

/* ------------------------------- Demo seed ------------------------------ */

export async function seedDemoData(): Promise<ActionResult> {
  const supabase = await db();
  if (!supabase) return err(NOT_CONNECTED);

  const SUB = "00000000-0000-0000-0000-000000000000";
  await supabase.from("transactions").delete().neq("id", SUB);
  await supabase.from("outsourcer_payments").delete().neq("id", SUB);
  await supabase.from("projects").delete().neq("id", SUB);
  await supabase.from("outsourcers").delete().neq("id", SUB);
  await supabase.from("accounts").delete().neq("id", SUB);

  const { data: accounts } = await supabase
    .from("accounts")
    .insert([
      { name: "Wise Business", currency: "USD" },
      { name: "HBL Current", currency: "PKR" },
    ])
    .select("id,name");
  const accountByName = new Map((accounts ?? []).map((a) => [a.name as string, a.id as string]));

  const { data: outs } = await supabase
    .from("outsourcers")
    .insert([
      { name: "Ahmed Khan", tax_rate: 5, transfer_fee_rate: 2 },
      { name: "Fatima Ali", tax_rate: 5, transfer_fee_rate: 2 },
      { name: "Hassan Malik", tax_rate: 5, transfer_fee_rate: 2 },
    ])
    .select("id,name");
  const outsByName = new Map((outs ?? []).map((o) => [o.name as string, o.id as string]));

  const { data: projects } = await supabase
    .from("projects")
    .insert([
      { title: "E-commerce Dashboard", amount_usd: 2400, outsourcer_id: outsByName.get("Ahmed Khan") ?? null, status: "completed" },
      { title: "Mobile App Redesign", amount_usd: 3800, outsourcer_id: outsByName.get("Fatima Ali") ?? null, status: "active" },
      { title: "API Integration", amount_usd: 1500, outsourcer_id: outsByName.get("Hassan Malik") ?? null, status: "active" },
      { title: "Brand Identity", amount_usd: 1800, outsourcer_id: outsByName.get("Ahmed Khan") ?? null, status: "completed" },
    ])
    .select("id,title");

  await supabase.from("transactions").insert([
    {
      type: "income",
      description: "Client payment — Acme Corp",
      amount: 5200,
      currency: "USD",
      account_id: accountByName.get("Wise Business") ?? null,
      project_id: null,
      transaction_date: new Date().toISOString(),
    },
    {
      type: "expense",
      description: "Cloud hosting — AWS",
      amount: 95,
      currency: "USD",
      account_id: accountByName.get("Wise Business") ?? null,
      project_id: null,
      transaction_date: new Date().toISOString(),
    },
  ]);

  await supabase
    .from("app_settings")
    .upsert(
      {
        id: 1,
        exchange_rate: 284.5,
        pay_percentage: 70,
        default_tax_rate: 5,
        default_transfer_fee_rate: 2,
      },
      { onConflict: "id" },
    );

  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/outsourcers");
  revalidatePath("/payments");
  void projects;

  return { ok: true, message: "Demo data loaded. Ready to use." };
}