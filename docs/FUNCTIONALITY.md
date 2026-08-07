# Moni — Functional Specification

> A self-hostable finance manager for a freelancer or small agency earning **USD** from clients and paying **outsourcers in PKR**. Built with Next.js 16 (App Router) + React 19, Drizzle ORM against native PostgreSQL 16, Tailwind v4, and shipped as a Docker image for Dokploy-style self-hosting.

---

## 1. Overview

| Aspect | Detail |
|---|---|
| App name | **Moni** |
| Purpose | Track projects, accounts, transactions, and outsourcer dues across USD and PKR |
| Deployment | Self-hosted via Docker / Dokploy (not a Vercel/serverless app) |
| Database | Native PostgreSQL 16, no external BaaS — Drizzle ORM for schema + type-safe queries |
| Data flow | Pages are `async` server components → `src/lib/data.ts` (React `cache()`-wrapped reads) → Postgres |
| Mutations | Server Actions in `src/app/actions.ts` — invoked from client components via `src/lib/action.ts#runAction`, never raw endpoints |
| PWA | Installable; Serwist-generated service worker, generated icons, web manifest |
| Auth | Mode-dependent — see [§2 Deployment modes](#2-deployment-modes) |

---

## 2. Deployment modes

Moni runs in one of two modes, selected by the `DEPLOYMENT_MODE` environment variable. There is no auto-detection — the operator sets this explicitly at deploy time.

### 2.1 `single_user`

- Zero authentication. There is no login screen and no session concept.
- On first read, the app auto-provisions a single default workspace (tenant) and every request is scoped to it.
- Intended for one freelancer self-hosting the app for themselves, where the Postgres instance itself is the trust boundary.

### 2.2 `multi_tenant`

- Requires signup/login before any workspace data is reachable.
- **Signup** creates a new tenant + user + membership (`role = owner`) together, in one transaction.
- **Sessions** are a signed JWT stored in an httpOnly cookie, signed/verified using `jose`.
  - `middleware.ts` verifies the session on every request and redirects unauthenticated requests away from protected routes.
  - `src/lib/tenant.ts#getTenantId()` independently re-verifies the session server-side on every data access. The tenant ID is derived **only** from the cryptographically verified JWT — never from a client-supplied header, cookie value, or query param — so a request cannot spoof its way into another tenant's data by forging a header.
- **`/admin`** is gated by the `ADMIN_EMAILS` environment variable (a comma-separated allowlist). It gives the instance operator a read-only list of all tenants provisioned on the instance — it is an operator console, not a per-tenant admin panel.

Both modes share the same schema, screens, and business logic — the only difference is whether requests are gated by a verified session before `getTenantId()` resolves a tenant.

---

## 3. Money model

Two currencies exist in the system:

- **USD** — money earned from clients (income).
- **PKR** — money held in local accounts and what outsourcers are paid.

USD is the canonical keeping unit inside the app. Every PKR figure is derived from USD using the **exchange rate** stored in `app_settings.exchange_rate` (per-tenant, default `284.50`).

All money math lives in `src/lib/payments.ts`:

- Every value is rounded to integer **cents** at each step (`toCents` / `fromCents` / `roundMoney`), so floating-point drift never accumulates across a multi-step chain.
- `calculateOutsourcerPayment(grossUsd, { taxRate, transferFeeRate, exchangeRate, payPercentage })` runs the full deduction chain and returns a `PaymentBreakdown`.

### The exact deduction chain

1. Start with the gross value of an outsourcer's completed projects (USD).
2. **Tax**: `tax_rate`% of the gross is deducted.
3. **Transfer fee**: `transfer_fee_rate`% of the amount *remaining after tax* is deducted.
4. What's left is **net USD**.
5. Convert to PKR at the tenant's `exchange_rate` → **net PKR**.
6. Multiply by `pay_percentage`% → the amount actually owed to the outsourcer.

```
gross (completed project value in USD)
  − tax                (gross × tax_rate %)
  − transfer fee       ((gross − tax) × transfer_fee_rate %)
  = net USD
  × exchange rate      (USD → PKR)
  = net PKR
  × pay percentage     (net PKR × pay_percentage %)
  = amount owed to outsourcer
```

### Validation

`calculateOutsourcerPayment` validates every input and throws a `RangeError` on violation:

- `grossUsd` must be non-negative.
- `taxRate` and `transferFeeRate` and `payPercentage` must each be between `0` and `100`.
- `exchangeRate` must be strictly positive.

---

## 4. Screens / routes

All pages are server components sharing the sidebar `PageShell` layout. When the database is not configured or a query fails, pages degrade to safe defaults instead of crashing (see [§6 Data layer](#6-data-layer--schema)).

### 4.1 Dashboard — `/`

- **Stat cards**: total balance (all accounts converted to USD), monthly income (USD), monthly expenses (expense + fee, USD), pending payments (sum of pending `net_pkr`, in PKR).
- **Recent projects** — a handful of the most recent, with status chip and amount.
- **Recent activity** — latest transactions with income/expense/fee styling.
- Charts (Recharts): cash-flow trend, account distribution, pending payouts.

### 4.2 Accounts — `/accounts`

- Cards per account (currency badge + derived **balance**).
- Balance is **computed**, not stored: `src/lib/data.ts` sums signed transaction amounts per account.
- Summary stats: number of accounts, USD holdings, PKR holdings, net worth (all converted to PKR).
- Add account (name, currency `USD | PKR`); delete.

### 4.3 Outsourcers — `/outsourcers`

- Roster of people you pay, each with **name**, **tax rate**, **transfer fee rate**.
- Per-row computed "monthly would-pay" using `calculateOutsourcerPayment` against the outsourcer's completed project value.
- Create / edit / delete (delete is blocked if projects still reference the outsourcer).

### 4.4 Projects — `/projects`

- Tracked client work: `title`, `amount_usd`, optional `outsourcer_id`, and `status` (`active` / `completed` / `cancelled`).
- Each project shows a payment breakdown preview using the tenant's default rates.
- Add project, change status, delete.

### 4.5 Payments — `/payments`

- **Run generator**: pick a month (`YYYY-MM`), exchange rate, and pay percentage. For every **completed** project assigned to an outsourcer, groups by outsourcer, sums gross USD, runs the full deduction chain, and upserts one row into `outsourcer_payments` keyed on `(tenant_id, outsourcer_id, month)`.
- **Pending dues**, grouped by month: gross USD, tax (rate + USD), transfer fee (rate + USD), net USD, net PKR, exchange rate, status chip.
- Mark as paid / void a pending payment.
- **Payment history**: previously paid rows, showing outsourcer, paid date, and net PKR.

### 4.6 Transactions — `/transactions`

- Full financial ledger: type (`income` / `expense` / `fee`), description, amount, currency, optional project + account link, date.
- Stat cards converted to USD (PKR transactions divided by `exchange_rate`).
- Record a transaction; delete a transaction.
- Table joins account / project names from `accounts` and `projects`.

### 4.7 Settings — `/settings`

- Edits exchange rate, pay percentage, default tax rate, default transfer fee rate — one row per tenant in `app_settings`.
- "How payments are calculated" walkthrough with a live example.
- Backup management: trigger a manual backup, view backup history, restore from a backup (see [§7 Backups](#7-backups)).

---

## 5. Server Actions (mutation layer)

All in `src/app/actions.ts` (`"use server"`), each returning `ActionResult = { ok: boolean; message: string }`, calling `revalidatePath` on the affected routes after a write. Client components call them through `src/lib/action.ts#runAction`, which wraps the call in `startTransition`, shows a `sonner` toast on success/failure, and surfaces thrown errors as a toast rather than an unhandled rejection.

| Action | What it does |
|---|---|
| `createAccount` / `deleteAccount` | Manage accounts |
| `createOutsourcer` / `updateOutsourcer` / `deleteOutsourcer` | Manage roster + rates |
| `createProject` / `updateProjectStatus` / `deleteProject` | Manage work items |
| `createTransaction` / `deleteTransaction` | Manage the ledger |
| `generateMonthlyPayments` | Run the per-outsourcer monthly payment generation |
| `markPaymentPaid` / `deletePayment` | Settle or void a payment |
| `updateSettings` | Save a tenant's rates and defaults |

**Error handling:** validation is server-side (non-negative amounts, rate ranges `0`–`100`, month format `YYYY-MM`). If the database is not configured or a query throws, actions return a `{ ok: false, message }` result instead of crashing.

Every action is implicitly scoped to `getTenantId()` — reads and writes never take a tenant identifier from the caller.

---

## 6. Data layer & schema

`src/lib/data.ts` holds async, `cache()`-wrapped reads. Queries are guarded so that **any query failure degrades gracefully** (default values / empty lists) rather than throwing — the UI never crashes outright when the DB is unreachable or mid-migration.

Schema lives in `src/db/schema.ts` (Drizzle) and is applied with `drizzle-kit push` / migrations.

| Table | Purpose | Notes |
|---|---|---|
| `tenants` | One row per workspace | `id`, `name`, `slug` (unique), `plan` |
| `users` | Login identities | `email` (unique), `password_hash` — only populated in `multi_tenant` mode |
| `memberships` | User ↔ tenant join | `role` (`owner` / `admin` / `member`), unique on `(user_id, tenant_id)` |
| `app_settings` | Per-tenant rates | one row per tenant, unique on `tenant_id` |
| `accounts` | USD/PKR holding accounts | |
| `outsourcers` | People paid monthly | `tax_rate`, `transfer_fee_rate` |
| `projects` | Client work items | FK → `outsourcers` (`SET NULL` on delete) |
| `transactions` | Ledger entries | FKs to `accounts`/`projects` are nullable |
| `outsourcer_payments` | Generated monthly payment runs | unique on `(tenant_id, outsourcer_id, month)` |
| `backups` | Backup manifest | per-tenant; `file_key`, `file_size`, `provider`, `encrypted` boolean |

Every business table (`accounts`, `outsourcers`, `projects`, `transactions`, `outsourcer_payments`, `backups`, `app_settings`) carries a `tenant_id` foreign key with `ON DELETE CASCADE` back to `tenants`, plus an index on `tenant_id` (composite where the table also indexes another dimension, e.g. `outsourcer_payments` indexes `(tenant_id, outsourcer_id, month)`). This is the isolation mechanism in both deployment modes: `single_user` has exactly one tenant row and every query is scoped to it the same way `multi_tenant` scopes to whichever tenant the verified session names.

---

## 7. Backups

- Backups are stored in Cloudflare R2 (S3-compatible) via `src/lib/r2.ts`, uploaded with the AWS SDK's S3 client pointed at the R2 endpoint.
- Backup payloads are encrypted with **AES-256-GCM** before upload. A `BACKUP_ENCRYPTION_KEY` environment variable is required for backups to run — there is no unencrypted fallback path.
- Backups run automatically once a day via the `/api/cron/backup` route, which is protected by a shared-secret check against the `CRON_SECRET` environment variable. A small cron sidecar service defined in `docker-compose.yml` calls this endpoint on a schedule.
- Backups can also be triggered manually from the Settings screen.
- **Restore** is available from Settings: it is destructive (overwrites current tenant data), tenant-scoped (only ever restores into the tenant that owns the backup), and gated behind an explicit confirmation step.

---

## 8. PWA / installability

- `src/app/manifest.ts` (or equivalent manifest route) — name/short_name, `standalone` display, theme colors.
- Service worker is generated at build time by **Serwist** (`@serwist/next`, `@serwist/precaching`) and registered client-side in production.
- Icons under `public/icons/` are generated via `npm run icons` (`scripts/generate-icons.mjs`) from the brand SVG.
- Install banner works from the browser's native "Install app" affordance.

---

## 9. Setup / run / deploy

### Local

```bash
npm install
cp .env.example .env.local      # set DATABASE_URL, DEPLOYMENT_MODE, etc.
npx drizzle-kit push            # apply schema to Postgres
npm run dev
```

### Self-hosted (Docker / Dokploy)

1. Build/run via the provided `Dockerfile` and `docker-compose.yml` (Next.js standalone build + Postgres + cron sidecar for backups).
2. Set `DEPLOYMENT_MODE` (`single_user` or `multi_tenant`), `DATABASE_URL`, and — for `multi_tenant` — `AUTH_SECRET`.
3. For backups, set the R2 credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`), `BACKUP_ENCRYPTION_KEY`, and `CRON_SECRET`.
4. Point a reverse proxy / tunnel at container port `3000`.

---

## 10. Non-goals / current limits

Documented honestly rather than aspirationally:

- **No OAuth / social login** — email + password only, in `multi_tenant` mode.
- **No password reset or email flows** — there is no outbound mail infrastructure wired up yet. A locked-out user currently has no self-service recovery path.
- **Rate limiting is in-memory and single-instance only** — it is not safe or effective across horizontally-scaled replicas (each instance has its own counters).
- **No per-payment historical FX-rate table** — `exchange_rate` is the tenant's current setting at generation time; past payment runs store the rate they used, but there is no independent rate-history table to audit against.
- **Reports/export**: no CSV export; PDF/print is limited to per-payment vouchers, not full reports.
