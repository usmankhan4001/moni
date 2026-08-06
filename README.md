<div align="center">

# 💸 Moni — Your Freelance Project Finance Manager

**A modern, self-hostable, multi-tenant freelance finance manager for creators earning in USD and paying contractors in local currencies (PKR).**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.38-green?style=flat-square&logo=drizzle)](https://orm.drizzle.team/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple?style=flat-square&logo=pwa)](https://web.dev/progressive-web-apps/)
[![Docker & Dokploy](https://img.shields.io/badge/Docker-Dokploy_Ready-blueviolet?style=flat-square&logo=docker)](https://dokploy.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

## 🌟 Key Features

- 📊 **Financial Dashboard & Interactive Charts**: Real-time Cash Flow area trends (Income vs Expenses), account distribution donut charts, and pending outsourcer payout bar graphs powered by Recharts.
- 🏢 **Dual Deployment Modes (`single_user` vs `multi_tenant`)**:
  - **Single-User Standalone**: Zero authentication friction with auto-provisioned local workspace.
  - **Multi-Tenant SaaS**: Subdomain routing (`tenant.domain.com`), workspace isolation, and request header scoping.
- ⚡ **Native PostgreSQL & Drizzle ORM**: Zero external third-party database dependencies. Built for speed, precision, and type safety with automated migrations.
- 📲 **Mobile-First PWA & Native App UX**: Mobile bottom dock, touch drawer sheets (`vaul`), pull-to-refresh feel, floating quick action button (`+ FAB`), and safe-area padding for mobile displays.
- 📄 **PDF & Payment Voucher Exports**: Print or export formatted payment slips with complete deduction breakdowns for contractor records.
- ☁️ **Cloudflare R2 Free Tier Backups**: Automated S3-compatible snapshot backups stored directly in Cloudflare R2 (10 GB free monthly storage, zero egress costs).
- 🐳 **Dokploy & Cloudflare Wildcard Tunnel Setup**: Pre-configured `Dockerfile` (standalone Next.js build) and `docker-compose.yml` tuned for Dokploy server hosting and Cloudflare wildcard tunnels (`*.yourdomain.com`).

---

## 📐 Architecture

```
                               ┌──────────────────────────────────────────────────┐
                               │     Cloudflare Wildcard Tunnel (*.domain.com)    │
                               └────────────────────────┬─────────────────────────┘
                                                        │
                                           ┌────────────┴────────────┐
                                           │     Dokploy Server      │
                                           │    (Docker Compose)     │
                                           └────────────┬────────────┘
                                                        │
             ┌──────────────────────────────────────────┴──────────────────────────────────────────┐
             │                                                                                     │
   ┌─────────▼─────────────────────────┐                                                 ┌─────────▼─────────────────────────┐
   │ Next.js 16 (App Router + React 19)│                                                 │     PostgreSQL 16 Database        │
   │ Mode: Single-User OR Multi-Tenant │ ─── Drizzle ORM (Type-safe Queries & Schemas) ──►│ (Tenant-Isolated Scoping + RLS) │
   └─────────────────┬─────────────────┘                                                 └───────────────────────────────────┘
                     │
      ┌──────────────┴──────────────┐
      │  Cloudflare R2 Free Tier    │ (Automated Daily Encrypted DB Backups & Snapshots)
      └─────────────────────────────┘
```

---

## 🧮 Payment Calculation Formula

Every monthly payout calculates deductions with integer-cent rounding to prevent floating-point drift:

```
gross (completed project value in USD)
  − tax                (gross × tax_rate %)
  − transfer fee       ((gross − tax) × transfer_fee_rate %)
  = net USD
  × exchange rate      (USD → PKR)
  = net PKR
  × pay percentage     (net PKR × pay_percentage %)
  = net amount owed to outsourcer
```

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js `20.x` or higher
- PostgreSQL `16.x` running locally or via Docker

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/photoshop3rrr/Moni.git
cd Moni

# Checkout V1.1 branch
git checkout V1.1

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### 3. Database Migration & Seeding
Set `DATABASE_URL` in `.env.local` (e.g. `postgres://postgres:postgres@localhost:5432/moni`):

```bash
# Push database migrations
npx drizzle-kit push

# Seed demo starter data (optional)
npm run seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🐳 Dokploy Deployment Guide (Cloudflare Tunnel)

### 1. Environment Variables Configuration
Set the following environment variables in your Dokploy application settings:

```env
NODE_ENV=production
DATABASE_URL=postgres://moni_user:moni_password@db:5432/moni_db
DEPLOYMENT_MODE=multi_tenant
R2_ACCOUNT_ID=your_cloudflare_r2_account_id
R2_ACCESS_KEY_ID=your_cloudflare_r2_access_key
R2_SECRET_ACCESS_KEY=your_cloudflare_r2_secret_key
R2_BUCKET_NAME=moni-backups
```

### 2. Dokploy Server Docker Compose Setup
Dokploy automatically uses the included `docker-compose.yml`:

```bash
docker-compose up -d --build
```

### 3. Cloudflare Wildcard Tunnel Configuration
- Point your wildcard domain rule `*.yourdomain.com` to your Dokploy server IP / container port `3000`.
- Host header forwarding is enabled by default, allowing subdomains to resolve tenant workspaces automatically.

---

## 🛠️ Available NPM Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts Next.js development server |
| `npm run build` | Builds production Next.js standalone application |
| `npm run start` | Runs built production server |
| `npm run typecheck` | Runs TypeScript type checker (`tsc --noEmit`) |
| `npm run lint` | Runs ESLint analysis |
| `npm run seed` | Seeds starter accounts, projects, and transactions into Postgres |

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
