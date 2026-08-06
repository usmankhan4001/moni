import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: [".env.local", ".env"], quiet: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    [
      "Missing Supabase environment variables.",
      "Create a .env.local in the project root with:",
      "",
      "  NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co",
      "  NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>",
      "",
      "Then run db/schema.sql in the Supabase SQL editor first (RLS is required).",
    ].join("\n"),
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function fail(label, hint) {
  if (hint?.error) {
    console.error(`[${label}] Supabase error:`, hint.error.message);
  } else {
    console.error(`[${label}] Unexpected failure; is RLS configured (run db/schema.sql)?`);
  }
  process.exit(1);
}

const SUB_ZERO_UUID = "00000000-0000-0000-0000-000000000000";

async function clearTable(table, label) {
  const { error } = await supabase.from(table).delete().neq("id", SUB_ZERO_UUID);
  if (error) fail(label, { error });
  console.log(`[seed] cleared ${table}`);
}

const accounts = [
  { name: "Wise Business", currency: "USD" },
  { name: "HBL", currency: "PKR" },
];

const outsourcers = [
  { name: "Ahmed Khan", tax_rate: 5, transfer_fee_rate: 2 },
  { name: "Fatima Ali", tax_rate: 5, transfer_fee_rate: 2 },
  { name: "Hassan Malik", tax_rate: 5, transfer_fee_rate: 2 },
  { name: "Sara Tariq", tax_rate: 5, transfer_fee_rate: 2 },
];

const projects = [
  { title: "E-commerce Dashboard", amount_usd: 2400, outsourcer: "Ahmed Khan", status: "completed" },
  { title: "Mobile App Redesign", amount_usd: 3800, outsourcer: "Fatima Ali", status: "active" },
  { title: "API Integration", amount_usd: 1500, outsourcer: "Hassan Malik", status: "active" },
  { title: "Estate Onboarding Flow", amount_usd: 1200, outsourcer: "Sara Tariq", status: "active" },
  { title: "Inventory Sync Tool", amount_usd: 1800, outsourcer: "Ahmed Khan", status: "cancelled" },
  { title: "Legacy Chat Cleanup", amount_usd: 2200, outsourcer: "Fatima Ali", status: "completed" },
];

const transactions = [
  { type: "income", description: "Client payment — Acme Corp", amount: 5200, currency: "USD", project: "E-commerce Dashboard", account: "Wise Business", transaction_date: "2025-01-15T10:00:00Z" },
  { type: "expense", description: "Outsourcer — Ahmed Khan", amount: 480, currency: "USD", project: "E-commerce Dashboard", account: "Wise Business", transaction_date: "2025-01-14T10:00:00Z" },
  { type: "fee", description: "Wise transfer fee", amount: 42.5, currency: "USD", account: "Wise Business", transaction_date: "2025-01-14T12:00:00Z" },
  { type: "income", description: "Client payment — Beta LLC", amount: 3200, currency: "USD", project: "Mobile App Redesign", account: "Wise Business", transaction_date: "2025-01-10T10:00:00Z" },
  { type: "expense", description: "Outsourcer — Fatima Ali", amount: 2660, currency: "USD", project: "Mobile App Redesign", account: "Wise Business", transaction_date: "2025-01-08T10:00:00Z" },
  { type: "income", description: "Client payment — Gamma Inc", amount: 1500, currency: "USD", project: "API Integration", account: "Wise Business", transaction_date: "2025-01-05T10:00:00Z" },
  { type: "expense", description: "Office utilities", amount: 8500, currency: "PKR", account: "HBL", transaction_date: "2025-01-20T10:00:00Z" },
  { type: "fee", description: "Payoneer payout fee", amount: 3.5, currency: "USD", account: "Wise Business", transaction_date: "2025-01-03T10:00:00Z" },
];

async function main() {
  for (const table of ["transactions", "outsourcer_payments", "projects", "outsourcers", "accounts", "app_settings"]) {
    await clearTable(table, `clear ${table}`);
  }

  const { data: accountRows, error: accountsError } = await supabase
    .from("accounts")
    .insert(accounts)
    .select();
  if (accountsError) fail("insert accounts", { error: accountsError });
  const accountIdByName = Object.fromEntries(accountRows.map((a) => [a.name, a.id]));

  const { data: outsourcerRows, error: outsourcersError } = await supabase
    .from("outsourcers")
    .insert(outsourcers)
    .select();
  if (outsourcersError) fail("insert outsourcers", { error: outsourcersError });
  const outsourcerIdByName = Object.fromEntries(outsourcerRows.map((o) => [o.name, o.id]));

  const { data: projectRows, error: projectsError } = await supabase
    .from("projects")
    .insert(
      projects.map(({ outsourcer, ...project }) => ({
        ...project,
        outsourcer_id: outsourcerIdByName[outsourcer],
      })),
    )
    .select();
  if (projectsError) fail("insert projects", { error: projectsError });
  const projectIdByTitle = Object.fromEntries(projectRows.map((p) => [p.title, p.id]));

  const { error: transactionsError } = await supabase.from("transactions").insert(
    transactions.map(({ project, account, ...transaction }) => ({
      ...transaction,
      project_id: project ? projectIdByTitle[project] : null,
      account_id: account ? accountIdByName[account] : null,
    })),
  );
  if (transactionsError) fail("insert transactions", { error: transactionsError });

  const { error: settingsError } = await supabase
    .from("app_settings")
    .upsert({
      id: 1,
      exchange_rate: 284.5,
      pay_percentage: 70,
      default_tax_rate: 5,
      default_transfer_fee_rate: 2,
    });
  if (settingsError) fail("insert app_settings", { error: settingsError });

  console.log(
    `[seed] done: ${accountRows.length} accounts, ${outsourcerRows.length} outsourcers, ` +
      `${projectRows.length} projects, ${transactions.length} transactions, 1 app_settings row. ` +
      "outsourcer_payments left empty (computed per month, not seeded).",
  );
}

main();