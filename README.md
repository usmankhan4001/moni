# Hisaab — Finance Tracker

A personal finance ledger for freelancers earning in **USD** and paying outsourcers in **PKR**. Track projects, income, expenses, and automatically calculate monthly outsourcer payments after tax + transfer fees.

## Features

- **Dashboard** — balance across accounts, monthly income vs expenses, pending outsourcer dues in PKR
- **Projects** — track title, USD amount, assignee, and status (active / completed / cancelled)
- **Payments** — one-click monthly payment generation. Deductions run: tax on gross → transfer fee on net-after-tax → convert to PKR → apply your pay share (%)
- **Transactions** — income / expense / fee ledger linked to accounts and projects
- **Outsourcers** — per-contractor tax + transfer-fee rates
- **Settings** — exchange rate (USD→PKR), pay percentage, default rates
- **PWA** — installable, works offline for cached pages

## Tech stack

- Next.js 16 (App Router, TypeScript), Tailwind CSS v4, shadcn/ui
- Supabase (PostgreSQL, free tier) — RLS-open for single-user
- Deploys free on Vercel

## Local setup

```bash
npm install
cp .env.example .env.local   # add your Supabase credentials
```

1. Create a free Supabase project.
2. Open **SQL editor** and run `db/schema.sql`.
3. Optional starter data: `npm run seed` (or use "Load demo data" in the app).

```bash
npm run dev
```

## Deploy to Vercel (free tier)

1. Push this repo to GitHub.
2. In Vercel: **New Project → Import** your repo. Framework is auto-detected as Next.js.
3. Add the environment variables from `.env.example` under **Settings → Environment Variables** (both `NEXT_PUBLIC_*`).
4. Deploy. The PWA manifest, service worker, and icons are already wired.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run seed` | Populate the database with demo data |
| `node scripts/generate-icons.mjs` | Regenerate PWA icons from the brand mark |

## How payments are calculated

```
gross (completed project USD)
  − tax                (gross × taxRate)
  − transfer fee       ((gross − tax) × feeRate)
  = net USD
  × exchange rate      (USD → PKR)
  = net PKR
  × pay %              (net PKR × payPercentage)
  = amount due to outsourcer
```

Money is rounded to integer cents at every step (`src/lib/payments.ts`).