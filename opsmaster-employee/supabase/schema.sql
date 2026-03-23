-- ============================================================
-- OpsMaster Employee Tracking — Supabase Schema
-- ============================================================

-- Extension: UUID generation
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLE: employees
-- ============================================================
create table if not exists employees (
  id            uuid primary key default gen_random_uuid(),
  wasp_id       text unique not null,
  first_name    text not null,
  last_name     text not null,
  department    text,
  job_title     text,
  pay_rate      numeric(10,2),
  pay_type      text,                      -- 'hourly' | 'salary'
  status        text not null default 'active'
                  check (status in ('active','inactive','on_leave')),
  hire_date     date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE: shifts
-- ============================================================
create table if not exists shifts (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references employees(id) on delete cascade,
  wasp_id       text,
  shift_date    date not null,
  clock_in      timestamptz,
  clock_out     timestamptz,
  shift_label   text,                      -- 'SHIFT A' | 'SHIFT B' etc.
  hours_worked  numeric(6,2),
  department    text,
  status        text default 'completed'
                  check (status in ('completed','in_progress','absent')),
  created_at    timestamptz not null default now()
);

-- ============================================================
-- TABLE: payroll_runs
-- ============================================================
create table if not exists payroll_runs (
  id                uuid primary key default gen_random_uuid(),
  file_name         text not null,
  imported_at       timestamptz not null default now(),
  pay_period_start  date,
  pay_period_end    date,
  total_employees   integer default 0,
  total_hours       numeric(10,2) default 0,
  total_gross_pay   numeric(12,2) default 0,
  row_count         integer default 0,
  error_count       integer default 0,
  status            text not null default 'processing'
                      check (status in ('processing','completed','partial','failed')),
  notes             text
);

-- ============================================================
-- TABLE: payroll_entries
-- ============================================================
create table if not exists payroll_entries (
  id                uuid primary key default gen_random_uuid(),
  payroll_run_id    uuid not null references payroll_runs(id) on delete cascade,
  employee_id       uuid not null references employees(id) on delete cascade,
  wasp_id           text,
  pay_period_start  date,
  pay_period_end    date,
  regular_hours     numeric(6,2) default 0,
  overtime_hours    numeric(6,2) default 0,
  total_hours       numeric(6,2) default 0,
  gross_pay         numeric(10,2) default 0,
  department        text,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- TABLE: import_errors
-- ============================================================
create table if not exists import_errors (
  id              uuid primary key default gen_random_uuid(),
  payroll_run_id  uuid not null references payroll_runs(id) on delete cascade,
  row_number      integer,
  raw_data        jsonb,
  error_message   text,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_shifts_shift_date    on shifts(shift_date);
create index if not exists idx_shifts_employee_id   on shifts(employee_id);
create index if not exists idx_employees_department on employees(department);
create index if not exists idx_employees_status     on employees(status);

-- ============================================================
-- VIEWS
-- ============================================================

-- dept_headcount: active employee count + avg pay_rate per department
create or replace view dept_headcount as
select
  department,
  count(*)                              as headcount,
  round(avg(pay_rate), 2)               as avg_pay_rate
from employees
where status = 'active'
group by department
order by headcount desc;

-- today_shifts: shift records joined with employee info for the current date
create or replace view today_shifts as
select
  s.id             as shift_id,
  s.shift_date,
  s.clock_in,
  s.clock_out,
  s.shift_label,
  s.hours_worked,
  s.status         as shift_status,
  e.id             as employee_id,
  e.wasp_id,
  e.first_name,
  e.last_name,
  e.department,
  e.job_title
from shifts s
join employees e on e.id = s.employee_id
where s.shift_date = current_date;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table employees      enable row level security;
alter table shifts         enable row level security;
alter table payroll_runs   enable row level security;
alter table payroll_entries enable row level security;
alter table import_errors  enable row level security;

-- Authenticated users have full access to all tables
create policy "authenticated_full_access_employees"
  on employees for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_full_access_shifts"
  on shifts for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_full_access_payroll_runs"
  on payroll_runs for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_full_access_payroll_entries"
  on payroll_entries for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_full_access_import_errors"
  on import_errors for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_employees_updated_at
  before update on employees
  for each row execute procedure set_updated_at();
