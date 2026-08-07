<div align="center">

# 💸 Moni — Your Freelance Project Finance Manager

**A modern, self-hostable, multi-tenant freelance finance manager for creators earning in USD and paying contractors in local currencies (PKR).**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-green?style=flat-square&logo=drizzle)](https://orm.drizzle.team/)
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
   ┌─────────▼─────────────────────────┐                                                 ┌─────────▼────────────────────────────────┐
   │ Next.js 16 (App Router + React 19)│                                                 │     PostgreSQL 16 Database               │
   │ Mode: Single-User OR Multi-Tenant │ ── Drizzle ORM (Type-safe Queries & Schemas) ──►│ (Tenant-Isolated Scoping + Session Auth) │
   └─────────────────┬─────────────────┘                                                 └──────────────────────────────────────────┘
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

## 🔐 Authentication (multi-tenant mode)

By default Moni runs in `single_user` mode, which has zero authentication. To enable multi-tenant login, set two environment variables:

```env
DEPLOYMENT_MODE=multi_tenant
AUTH_SECRET=your_long_random_secret
```

Generate a strong `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Then visit `/signup` to create the first workspace (tenant), which also creates the owner account for it.

In `single_user` mode, no auth is needed at all — `/signup` and `/login` are not used.

---

## 🐳 Dokploy Deployment Guide (Cloudflare Tunnel)

### 1. Environment Variables Configuration
Set the following environment variables in your Dokploy application settings:

```env
NODE_ENV=production
DATABASE_URL=postgres://moni_user:moni_password@db:5432/moni_db
DEPLOYMENT_MODE=multi_tenant
AUTH_SECRET=your_generated_auth_secret
MONI_DOMAIN=yourdomain.com
R2_ACCOUNT_ID=your_cloudflare_r2_account_id
R2_ACCESS_KEY_ID=your_cloudflare_r2_access_key
R2_SECRET_ACCESS_KEY=your_cloudflare_r2_secret_key
R2_BUCKET_NAME=moni-backups
```

`MONI_DOMAIN` is the apex domain only — no scheme, no wildcard, no trailing
slash. Traefik's Host rule is generated from it.

### 2. Dokploy Server Docker Compose Setup
Dokploy automatically uses the included `docker-compose.yml`:

```bash
docker-compose up -d --build
```

The app service ships with `traefik.enable=true`, a Host rule covering both
`yourdomain.com` and `*.yourdomain.com`, and an attachment to the external
`dokploy-network`. Traefik needs all three to route to the container — the
service publishes no host port by design. If the domain returns a plain-text
`404 page not found`, that is Traefik reporting that no router matched, which
almost always means `MONI_DOMAIN` is unset/mismatched or `dokploy-network`
doesn't exist on the host.

### 3. Cloudflare Wildcard Tunnel Configuration
- Point your wildcard hostname `*.yourdomain.com` (and the apex) at the tunnel,
  with the origin service set to `http://localhost:80` — that is Dokploy's
  Traefik `web` entrypoint, **not** container port `3000`. Nothing listens on
  `3000` at the host level; Traefik reaches the container over the Docker network.
- Leave Host header forwarding on (the Cloudflare default) so Traefik still sees
  the original hostname and can match its router.

> **Note on tenant resolution:** subdomains are cosmetic. The active workspace is
> derived exclusively from a signed session cookie (`getTenantId()` in
> `src/lib/tenant.ts`) — never from the subdomain or any client-supplied header.
> Visiting another tenant's subdomain grants no access to their data.

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
| `npm run icons` | Regenerates PWA icons from the brand SVG |

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
