# Hisaab — Finance Tracker · Functional Specification

> A single-user, installable web app for a freelancer who earns **USD** (from international clients) and pays **outsourcers in PKR** every month. Built with Next.js (App Router), Supabase, shadcn/ui, and a "Ledger" design identity.

---

## 1. Overview

| Aspect | Detail |
|---|---|
| App name | **Hisaab** (اردو: حساب — "account / bookkeeping") |
| Purpose | Track projects, accounts, transactions, and outsourcer dues across USD and PKR |
| Deployment | Vercel (serverless, `force-dynamic` pages) |
| Database | Supabase (PostgreSQL, all tables RLS-open for a single owner) |
| Data flow | Pages are `async` server components → `src/lib/data.ts` (React `cache()`-wrapped reads) → Supabase |
| Mutations | Server Actions in `src/app/actions.ts` — invoked from client components via `src/lib/action.ts#runAction`, never raw endpoints |
| PWA | Installable; `public/sw.js`, generated icons, web manifest at `/manifest.webmanifest` |

---

## 2. Currency model

Two currencies exist in the system:

- **USD** — money earned from clients (income).
- **PKR** — money held in local accounts and what outsourcers are paid.

USD is the canonical keeping unit inside the app. Every PKR figure is derived from USD using the **exchange rate** stored in `app_settings.exchange_rate` (default `284.5`).

All money math goes through `src/lib/payments.ts`:

- Convert to integer **cents** at every boundary (`roundMoney`) so floating-point drift never accumulates.
- Exchange breakdown: gross USD → minus tax → minus transfer fee → net USD → **× exchange rate = net PKR** → × **pay percentage = what the outsourcer actually receives**.

### The exact deduction chain (documented in-app on /settings)

1. Start with the gross value of an outsourcer's completed projects (USD).
2. **Tax** at the outsourcer's `tax_rate` (default 5%) of the gross.
3. **Transfer fee** at `transfer_fee_rate` (default 2%) of the amount left *after tax*.
4. Convert the remainder to PKR at the exchange rate → true "net".
5. Multiply by the pay percentage (default 70%) → the share passed to the outsourcer.

Example (from /settings): a `$1,000` gross nets **Rs 219,653** in PKR after all deductions, and the outsourcer receives **Rs 153,757** (70%).

---

## 3. Screens / Routes

All pages are marked `export const dynamic = "force-dynamic"` and share the sidebar `PageShell` layout. When Supabase is not configured, pages render a *"Connect your database"* banner instead of crashing.

### 3.1 Dashboard — `/`

Server components render the page; `Suspense` boundaries stream in each section with skeletons.

- **ConversionStamp** (signature element): a rotated, double-bordered circular badge showing live pending USD → PKR at the current rate.
- **Stat cards**:
  - Total balance (all accounts converted to USD)
  - Monthly income (transactions filtered to current month, USD)
  - Monthly expenses (expense + fee, USD)
  - Pending payments (sum of pending `net_pkr`, in PKR)
- **Recent projects** — up to 5, with status chip and amount.
- **Recent activity** — last 5 transactions with income/expense/fee styling.
- **Next payment panel** — dark ink panel summing pending dues in PKR.

### 3.2 Accounts (`/`accounts`)

- Cards per account (currency badge + derived **balance**).
- Balance is **computed**, not stored: `src/lib/data.ts#getAccounts` sums
  `income + expenses −` sign per transaction for each account.
- Summary stats: # accounts, USD holdings (≈ PKR at the rate), PKR holdings, **Net worth** (all converted to PKR).
- Add account (name, currency `USD | PKR`) via `AccountForm`; delete via `DeleteAccountButton`.
- Empty state: *"Add a Wise USD balance and a PKR bank account…"*.

### 3.3 Outsourcers (`/outsourcers`)

- Roster of people you pay, each with **name**, **tax rate**, **transfer fee rate**.
- Per-row computed values from completed projects:
  - `monthlyPayPkr` — "Monthly would-pay" = full payment math (`calculateOutsourcerPayment`) applied to the outsourcer's completed USD.
- Stats: active outsourcers, projects assigned (completed count), default rates.
- Create / edit (`OutsourcerForm`), delete (`DeleteOutsourcerButton` — blocked if projects reference them).

### 3.4 Projects (`/projects`)

- Tracked client work with `title`, `amount_usd`, optional `outsourcer_id`, and `status` (active / completed / cancelled).
- Each project computes a payment breakdown preview using `calculateOutsourcerPayment` with the global default rates.
- Stats: **Active value** (sum of `amount_usd` for active projects) and counts.
- Add project (`ProjectForm`), change status + delete (`ProjectActions`).

### 3.5 Payments (`/payments`)

- **Run generator** (`GeneratePaymentDialog`): pick a month (`YYYY-MM`), exchange rate, and pay percentage. For every **completed** project assigned to an outsourcer:
  - Group by outsourcer, sum gross USD, run the full deduction chain, `upsert` one row into `outsourcer_payments` keyed on `(outsourcer_id, month)`, `due_date` = 1st of the month, status `pending`.
- **Pending dues** grouped by month, each rendered as a `PaymentCard`:
  - Gross USD, tax (rate + USD), transfer fee (rate + USD), net USD, net PKR, exchange rate, status chip.
  - `Mark as paid`, `Delete`.
- **Summary cards**: total pending dues (PKR), pending count, next due date.
- **Payment history**: previously paid rows, dimmed, showing outsourcer + paid date + net PKR.

### 3.6 Transactions (`/transactions`)

- Full financial ledger: type (`income` expensed `fee`), description, amount, currency, optional project + account link, date.
- **Stat cards** converted to USD: income, expenses, fees (PKR transactions divided by `exchange_rate`).
- `NewTransactionDialog` records a transaction; `TransactionRowActions` deletes.
- Table shows account / project names joined from `accounts` and `projects`.

### 3.7 Settings (`/settings`)

- **SettingsForm** edits:
  - exchange rate (PKR per USD)
  - pay % (share sent to outsourcers)
  - default tax %, default transfer fee %
- Persist via `updateSettings` as a single row (`app_settings.id = 1`, `upsert` on conflict).
- **"How payments are calculated"** walkthrough + live example at `$1,000` gross.
- **Demo data**: `SeedButton` → `seedDemoData` wipes all tables then inserts a small starter set (2 accounts, 3 outsources, 4 projects, 2 transactions, settings). Destructive.

---

## 4. Server Actions (mutation layer)

All in `src/app/actions.ts` (`"use server"`), returning `ActionResult = { ok, message }`, and always
`revalidatePath` the affected routes after a write.

| Action | What it does |
|---|---|
| `createAccount` / `deleteAccount` | Manage accounts |
| `createOutsourcer` / `updateOutsourcer` / `deleteOutsourcer` | Manage roster + rates |
| `createProject` / `updateProjectStatus` / `deleteProject` | Manage work items |
| `createTransaction` / `deleteTransaction` | Manage the ledger |
| `generateMonthlyPayments` | Bullet the per-outsourcer monthly run |
| `markPaymentPaid` / `deletePayment` | Settle or remove a payment |
| `updateSettings` | Save global rates and defaults |
| `seedDemoData` | Replace data with the demo dataset |

**Error handling:** validations are server-side (positive amounts, rate range 0–100, month format `YYYY-MM`, pay %
0–100). If Supabase env is unset, every action returns a "not connected" error instead of crashing.
Client callers wrap actions with `runAction` (toast on success/failure, snow startTransition).

---

## 5. Data layer & schema

`src/lib/data.ts` — async, `cache()`-wrapped reads. All queries `.catch`-style guard:
**any query failure degrades gracefully** (`err` → default values) so the UI never throws when the DB
is down or a table is missing.

| Table | Rows | Notes |
|---|---|---|
| `accounts` | id, name, usd/pkr | RLS open |
| `outsourcers` | id, name (uniq), tax_rate, transfer_fee_rate | |
| `projects` | id, title, amount_usd, outsourcer_id, status | FK → outsourcers (SET NULL) |
| `transactions` | id, type, description, amount, currency, project_id, account_id, transaction_date | FKs incl. nullable |
| `outsourcer_payments` | id, outsourcer_id, month, gross/tax/fee/net (USD+PKR), status, due_date, paid_at | `UNIQUE(outsourcer_id, month)`, DB-enforced math invariants |
| `app_settings` | `id=1` singleton: exchange_rate, pay %, default rates | single-row pattern |

Schema lives at `db/schema.sql` — run it once in the Supabase SQL editor (tables, triggers,
RLS "open access" policies lot).

### RLS model
All policies are `FOR ALL USING (true) WITH CHECK (true)` — a single-owner app trusting the client key.
Not for public/multi-tenant use; acceptable for this personal tool.

### Costant keys
- Supabase URL: env `NEXT_PUBLIC_SUPABASE_URL`; anon key: `ENV_PUBLIC_SUPABASE_ANON_KEY`.
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`) is only instantiated server-side when configured
  (used by `scripts/seed.mjs`).

---

## 6. PWA / installability

- `src/app/manifest.ts` — name/short_name, `standalone`, theme colors (Ledger ink/paper).
- `public/icons/icon-192.png`, `icon-512.png` — generated via `npm run icons`.
- `public/sw.js` — offline-capable service worker; registered only in production
  (`ServiceWorkerRegistration`).
- Install banner works from the browser "Install app" affordance.

---

## 7. Setup / run / deploy

### Local
```bash
npm install
cp .env.example .env.local      # fill SUPABASE_URL + anon key
npm run dev                     # (Next dev; Vercel env not required)
```

### Database
1. Create a Supabase project.
2. Open **SQL editor** → paste contents of `db/schema.sql` → run.
3. (Optional) `npm run seed` (`scripts/seed.mjs`) to load the demo set server-side.

### Deploy (Vercel)
1. Push this repo to GitHub.
2. In Vercel → **New Project** → import the repo (Next.js auto-detected).
3. Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy. The app renders a friendly "Connect your database" banner until connected.

---

## 7. Non-goals / limits

- **Auth**: intentionally none (single owner, open RLS). Do not expose to strangers.
- **Sync**: components are server-rendered; no offline write queue (PWA caches static shells only).
- **Multi-currency FX history**: rates are global, not per-payment-settlement; no historical-rate table.
- **Reports/export**: not included (stat cards summarize; no CSV/PDF).