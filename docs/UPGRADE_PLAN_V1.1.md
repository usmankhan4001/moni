# Moni V1.1 — Master Upgrade & System Architecture Plan

```
===================================================================================
Application Name  : Moni - Your Freelance Project Finance Manager
Target Branch     : V1.1
Database Engine   : Native PostgreSQL 16 (Drizzle ORM)
Deployment Target : Dokploy Server via Cloudflare Wildcard Tunnel (*.yourdomain.com)
Backup System     : Cloudflare R2 Free Tier (10GB S3-Compatible Storage)
UI & Analytics    : shadcn/ui + Tailwind CSS v4 + Recharts + Vaul Action Sheets
Mobile Strategy   : Mobile-First PWA with Bottom Dock & Native UX
Deployment Modes  : Dual Mode (Single-User Standalone vs. Multi-Tenant SaaS)
===================================================================================
```

## 1. Executive Summary & Core Goals
Moni version 1.1 transforms the financial management app into a self-hostable, multi-tenant capable, mobile-first SaaS solution with native PostgreSQL support, interactive analytics, and Cloudflare R2 backups.

## 2. Key Architecture Components

### Dual Deployment Modes (`DEPLOYMENT_MODE`)
- `single_user`: Auto-provisions default workspace, no auth barrier, full feature set.
- `multi_tenant`: Auth.js authentication, workspace tenant scoping (`tenant_id`), subdomain/header routing for wildcard Cloudflare tunnels.

### Native PostgreSQL & Drizzle ORM
- Replaces Supabase dependency completely.
- Uses `drizzle-orm` + `pg` client.
- Automated migrations on container startup (`drizzle-kit`).

### Mobile-First PWA & UI Revamp
- Rebranded to **Moni - Your Freelance Project Finance Manager**.
- Interactive Recharts components (Cash Flow Area Chart, Income/Expense Donut, Outsourcer Payout Bar Chart).
- Mobile bottom navigation dock, slide-up action sheets (`vaul`), pull-to-refresh feel, safe area padding.

### Cloudflare R2 Backups & Invoices
- S3-compatible `@aws-sdk/client-s3` backup service storing compressed DB snapshots in Cloudflare R2 free tier.
- Client PDF/HTML invoices and outsourcer payment receipt vouchers.

### Dokploy & Cloudflare Tunnel Containerization
- Multi-stage Next.js `Dockerfile` (`output: "standalone"`).
- `docker-compose.yml` bundling Next.js app and PostgreSQL 16 database.
