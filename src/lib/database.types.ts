import { z } from "zod";

export const currencySchema = z.enum(["USD", "PKR"]);
export const projectStatusSchema = z.enum(["active", "completed", "cancelled"]);
export const transactionTypeSchema = z.enum(["income", "expense", "fee"]);
export const paymentStatusSchema = z.enum(["pending", "paid"]);

export type Currency = z.infer<typeof currencySchema>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type TransactionType = z.infer<typeof transactionTypeSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

const idSchema = z.uuid();
const timestampSchema = z.string();

export const accountSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  currency: currencySchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type Account = z.infer<typeof accountSchema>;
export type AccountInsert = Omit<Account, "id" | "created_at" | "updated_at">;
export type AccountUpdate = Partial<AccountInsert>;

export const outsourcerSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  tax_rate: z.number().min(0).max(100),
  transfer_fee_rate: z.number().min(0).max(100),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type Outsourcer = z.infer<typeof outsourcerSchema>;
export type OutsourcerInsert = Omit<Outsourcer, "id" | "created_at" | "updated_at">;
export type OutsourcerUpdate = Partial<OutsourcerInsert>;

export const projectSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  amount_usd: z.number().positive(),
  outsourcer_id: idSchema.nullable(),
  status: projectStatusSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type Project = z.infer<typeof projectSchema>;
export type ProjectInsert = Omit<Project, "id" | "created_at" | "updated_at">;
export type ProjectUpdate = Partial<ProjectInsert>;

export const transactionSchema = z.object({
  id: idSchema,
  type: transactionTypeSchema,
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: currencySchema,
  project_id: idSchema.nullable(),
  account_id: idSchema.nullable(),
  transaction_date: timestampSchema,
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionInsert = Omit<Transaction, "id" | "created_at" | "updated_at">;
export type TransactionUpdate = Partial<TransactionInsert>;

export const outsourcerPaymentSchema = z.object({
  id: idSchema,
  outsourcer_id: idSchema,
  month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gross_usd: z.number().positive(),
  tax_rate: z.number().min(0).max(100),
  tax_usd: z.number().nonnegative(),
  transfer_fee_rate: z.number().min(0).max(100),
  transfer_fee_usd: z.number().nonnegative(),
  net_usd: z.number().nonnegative(),
  exchange_rate: z.number().positive(),
  net_pkr: z.number().nonnegative(),
  status: paymentStatusSchema,
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paid_at: timestampSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type OutsourcerPayment = z.infer<typeof outsourcerPaymentSchema>;
export type OutsourcerPaymentInsert = Omit<
  OutsourcerPayment,
  "id" | "created_at" | "updated_at"
>;
export type OutsourcerPaymentUpdate = Partial<OutsourcerPaymentInsert>;

export const appSettingsSchema = z.object({
  id: z.literal(1),
  exchange_rate: z.number().positive(),
  pay_percentage: z.number().min(0).max(100),
  default_tax_rate: z.number().min(0).max(100),
  default_transfer_fee_rate: z.number().min(0).max(100),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});
export type AppSettings = z.infer<typeof appSettingsSchema>;
export type AppSettingsInsert = Omit<AppSettings, "id" | "created_at" | "updated_at">;
export type AppSettingsUpdate = Partial<AppSettingsInsert>;

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: Account;
        Insert: AccountInsert;
        Update: AccountUpdate;
        Relationships: [];
      };
      outsourcers: {
        Row: Outsourcer;
        Insert: OutsourcerInsert;
        Update: OutsourcerUpdate;
        Relationships: [];
      };
      projects: {
        Row: Project;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
        Relationships: [];
      };
      transactions: {
        Row: Transaction;
        Insert: TransactionInsert;
        Update: TransactionUpdate;
        Relationships: [];
      };
      outsourcer_payments: {
        Row: OutsourcerPayment;
        Insert: OutsourcerPaymentInsert;
        Update: OutsourcerPaymentUpdate;
        Relationships: [];
      };
      app_settings: {
        Row: AppSettings;
        Insert: AppSettingsInsert;
        Update: AppSettingsUpdate;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
  };
}