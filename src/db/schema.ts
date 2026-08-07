import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  date,
  integer,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// 1. Tenants (Workspaces)
// ---------------------------------------------------------------------------
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("pro"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 2. Users
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 3. Memberships
// ---------------------------------------------------------------------------
export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
    role: text("role").notNull().default("owner"), // owner | admin | member
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uniq_user_tenant").on(table.userId, table.tenantId),
  ]
);

// ---------------------------------------------------------------------------
// 4. App Settings per Tenant
// ---------------------------------------------------------------------------
export const appSettings = pgTable("app_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull().unique(),
  exchangeRate: numeric("exchange_rate", { precision: 14, scale: 2 }).notNull().default("284.50"),
  payPercentage: numeric("pay_percentage", { precision: 5, scale: 2 }).notNull().default("70.00"),
  defaultTaxRate: numeric("default_tax_rate", { precision: 5, scale: 2 }).notNull().default("5.00"),
  defaultTransferFeeRate: numeric("default_transfer_fee_rate", { precision: 5, scale: 2 }).notNull().default("2.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// 5. Accounts
// ---------------------------------------------------------------------------
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  currency: text("currency").notNull().default("USD"), // USD | PKR
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("accounts_tenant_idx").on(table.tenantId),
]);

// ---------------------------------------------------------------------------
// 6. Outsourcers
// ---------------------------------------------------------------------------
export const outsourcers = pgTable("outsourcers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("5.00"),
  transferFeeRate: numeric("transfer_fee_rate", { precision: 5, scale: 2 }).notNull().default("2.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("outsourcers_tenant_idx").on(table.tenantId),
]);

// ---------------------------------------------------------------------------
// 7. Projects
// ---------------------------------------------------------------------------
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  amountUsd: numeric("amount_usd", { precision: 14, scale: 2 }).notNull(),
  outsourcerId: uuid("outsourcer_id").references(() => outsourcers.id, { onDelete: "set null" }),
  status: text("status").notNull().default("active"), // active | completed | cancelled
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("projects_tenant_idx").on(table.tenantId),
  index("projects_outsourcer_idx").on(table.outsourcerId),
  index("projects_status_idx").on(table.status),
]);

// ---------------------------------------------------------------------------
// 8. Transactions
// ---------------------------------------------------------------------------
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  type: text("type").notNull(), // income | expense | fee
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"), // USD | PKR
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
  transactionDate: timestamp("transaction_date", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("transactions_tenant_idx").on(table.tenantId),
  index("transactions_account_idx").on(table.accountId),
  index("transactions_project_idx").on(table.projectId),
  index("transactions_date_idx").on(table.transactionDate),
]);

// ---------------------------------------------------------------------------
// 9. Outsourcer Payments
// ---------------------------------------------------------------------------
export const outsourcerPayments = pgTable("outsourcer_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  outsourcerId: uuid("outsourcer_id").references(() => outsourcers.id, { onDelete: "cascade" }).notNull(),
  month: date("month").notNull(),
  grossUsd: numeric("gross_usd", { precision: 14, scale: 2 }).notNull(),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull(),
  taxUsd: numeric("tax_usd", { precision: 14, scale: 2 }).notNull(),
  transferFeeRate: numeric("transfer_fee_rate", { precision: 5, scale: 2 }).notNull(),
  transferFeeUsd: numeric("transfer_fee_usd", { precision: 14, scale: 2 }).notNull(),
  netUsd: numeric("net_usd", { precision: 14, scale: 2 }).notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 14, scale: 2 }).notNull(),
  netPkr: numeric("net_pkr", { precision: 14, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending | paid
  dueDate: date("due_date").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("uniq_tenant_outsourcer_month").on(table.tenantId, table.outsourcerId, table.month),
  index("payments_tenant_idx").on(table.tenantId),
  index("payments_status_idx").on(table.status),
]);

// ---------------------------------------------------------------------------
// 10. Backups
// ---------------------------------------------------------------------------
export const backups = pgTable("backups", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  fileKey: text("file_key").notNull(),
  fileSize: integer("file_size").notNull(),
  provider: text("provider").notNull().default("r2"),
  encrypted: boolean("encrypted").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("backups_tenant_idx").on(table.tenantId),
]);
