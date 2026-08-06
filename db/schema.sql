-- db/schema.sql
-- Hisaab personal finance tracker schema for Supabase/PostgreSQL.

-- Shared updated_at trigger function.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  currency text not null check (currency in ('USD', 'PKR')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at_accounts on public.accounts;
create trigger set_updated_at_accounts
  before update on public.accounts
  for each row execute function public.set_updated_at();

alter table public.accounts enable row level security;
drop policy if exists "open access" on public.accounts;
create policy "open access"
  on public.accounts
  for all
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- outsourcers
-- ---------------------------------------------------------------------------
create table if not exists public.outsourcers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (btrim(name) <> ''),
  tax_rate numeric(5, 2) not null default 5 check (tax_rate >= 0 and tax_rate <= 100),
  transfer_fee_rate numeric(5, 2) not null default 2 check (transfer_fee_rate >= 0 and transfer_fee_rate <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at_outsourcers on public.outsourcers;
create trigger set_updated_at_outsourcers
  before update on public.outsourcers
  for each row execute function public.set_updated_at();

alter table public.outsourcers enable row level security;
drop policy if exists "open access" on public.outsourcers;
create policy "open access"
  on public.outsourcers
  for all
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null check (btrim(title) <> ''),
  amount_usd numeric(14, 2) not null check (amount_usd > 0),
  outsourcer_id uuid references public.outsourcers (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_projects_outsourcer_id on public.projects (outsourcer_id);
create index if not exists idx_projects_status on public.projects (status);

drop trigger if exists set_updated_at_projects on public.projects;
create trigger set_updated_at_projects
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
drop policy if exists "open access" on public.projects;
create policy "open access"
  on public.projects
  for all
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income', 'expense', 'fee')),
  description text not null check (btrim(description) <> ''),
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null default 'USD' check (currency in ('USD', 'PKR')),
  project_id uuid references public.projects (id) on delete set null,
  account_id uuid references public.accounts (id) on delete set null,
  transaction_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_project_id on public.transactions (project_id);
create index if not exists transactions_account_id on public.transactions (account_id);
create index if not exists transactions_transaction_date on public.transactions (transaction_date desc);
create index if not exists transactions_type on public.transactions (type);

drop trigger if exists set_updated_at_transactions on public.transactions;
create trigger set_updated_at_transactions
  before update on public.transactions
  for each row execute function public.set_updated_at();

alter table public.transactions enable row level security;
drop policy if exists "open access" on public.transactions;
create policy "open access"
  on public.transactions
  for all
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- outsourcer_payments
-- One row per outsourcer per calendar month; values are computed by
-- src/lib/payments.ts before insert, never by hand.
-- ---------------------------------------------------------------------------
create table if not exists public.outsourcer_payments (
  id uuid primary key default gen_random_uuid(),
  outsourcer_id uuid not null references public.outsourcers (id) on delete cascade,
  month date not null,
  gross_usd numeric(14, 2) not null check (gross_usd > 0),
  tax_rate numeric(5, 2) not null check (tax_rate >= 0 and tax_rate <= 100),
  tax_usd numeric(14, 2) not null check (tax_usd >= 0),
  transfer_fee_rate numeric(5, 2) not null check (transfer_fee_rate >= 0 and transfer_fee_rate <= 100),
  transfer_fee_usd numeric(14, 2) not null check (transfer_fee_usd >= 0),
  net_usd numeric(14, 2) not null check (net_usd >= 0),
  exchange_rate numeric(14, 2) not null check (exchange_rate > 0),
  net_pkr numeric(14, 2) not null check (net_pkr >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid')),
  due_date date not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (outsourcer_id, month),
  -- Enforce the documented math and state invariants at the database layer.
  check (net_pkr = round(net_usd * exchange_rate, 2)),
  check (status <> 'paid' or paid_at is not null),
  check (paid_at is null or status = 'paid')
);

create index if not exists outsourcer_payments_month on public.outsourcer_payments (month);
create index if not exists outsourcer_payments_status on public.outsourcer_payments (status);

drop trigger if exists set_updated_at_outsourcer_payments on public.outsourcer_payments;
create trigger set_updated_at_outsourcer_payments
  before update on public.outsourcer_payments
  for each row execute function public.set_updated_at();

alter table public.outsourcer_payments enable row level security;
drop policy if exists "open access" on public.outsourcer_payments;
create policy "open access"
  on public.outsourcer_payments
  for all
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- app_settings
-- Single user, single row: the check on id forces primary-key id = 1, so an
-- insert with any other id is rejected.
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  id integer primary key check (id = 1),
  exchange_rate numeric(14, 2) not null default 284.50 check (exchange_rate > 0),
  pay_percentage numeric(5, 2) not null default 70 check (pay_percentage >= 0 and pay_percentage <= 100),
  default_tax_rate numeric(5, 2) not null default 5 check (default_tax_rate >= 0 and default_tax_rate <= 100),
  default_transfer_fee_rate numeric(5, 2) not null default 2 check (default_transfer_fee_rate >= 0 and default_transfer_fee_rate <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at_app_settings on public.app_settings;
create trigger set_updated_at_app_settings
  before update on public.app_settings
  for each row execute function public.set_updated_at();