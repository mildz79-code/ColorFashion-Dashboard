-- Color Fashion Financial Dashboard — Schema
-- Creates pl_line_items (chart of accounts) and pl_monthly (fact table, long format).

-- Line item master
create table if not exists public.pl_line_items (
  id          serial primary key,
  label       text unique not null,
  category    text not null check (category in ('REVENUE','COGS','OPEX','OTHER')),
  sort_order  int  not null
);

-- Long-format monthly P&L: one row per (line_item, year, month, source)
create table if not exists public.pl_monthly (
  id            bigserial primary key,
  line_item_id  int not null references public.pl_line_items(id) on delete cascade,
  year          int not null,
  month         int not null check (month between 1 and 12),
  amount        numeric(14,2) not null,
  source        text not null check (source in ('actual','budget','forecast')),
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (line_item_id, year, month, source)
);

create index if not exists pl_monthly_year_month_idx on public.pl_monthly (year, month);
create index if not exists pl_monthly_source_idx on public.pl_monthly (source);

-- RLS: permissive for authenticated users (matches existing tables in this project)
alter table public.pl_line_items enable row level security;
alter table public.pl_monthly    enable row level security;

create policy pl_line_items_authenticated_all
  on public.pl_line_items for all
  to authenticated using (true) with check (true);

create policy pl_monthly_authenticated_all
  on public.pl_monthly for all
  to authenticated using (true) with check (true);
