-- ============================================================
-- OpsMaster Employee Tracking — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- EMPLOYEES — master record per person
-- ============================================================
create table if not exists employees (
  id              uuid primary key default uuid_generate_v4(),
  wasp_id         text unique not null,         -- ID from Wasp payroll export
  first_name      text not null,
  last_name       text not null,
  department      text not null,                -- Dyeing, Shipping, Finishing, Office, Maintenance
  job_title       text,
  pay_rate        numeric(10, 2),               -- hourly rate
  pay_type        text default 'hourly',        -- hourly | salary
  status          text default 'active',        -- active | inactive | on_leave
  hire_date       date,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- SHIFTS — clock in/out per employee per day
-- ============================================================
create table if not exists shifts (
  id              uuid primary key default uuid_generate_v4(),
  employee_id     uuid references employees(id) on delete cascade,
  wasp_id         text not null,                -- links back to Wasp employee ID
  shift_date      date not null,
  clock_in        timestamptz,
  clock_out       timestamptz,
  shift_label     text,                         -- SHIFT A, SHIFT B, etc.
  hours_worked    numeric(5, 2),
  department      text,
  status          text default 'completed',     -- active | completed | absent | late
  created_at      timestamptz default now()
);

-- ============================================================
-- PAYROLL_RUNS — each CSV import batch
-- ============================================================
create table if not exists payroll_runs (
  id              uuid primary key default uuid_generate_v4(),
  file_name       text not null,
  imported_at     timestamptz default now(),
  pay_period_start date,
  pay_period_end  date,
  total_employees int,
  total_hours     numeric(10, 2),
  total_gross_pay numeric(12, 2),
  row_count       int,
  error_count     int default 0,
  status          text default 'completed',     -- completed | partial | failed
  notes           text
);

-- ============================================================
-- PAYROLL_ENTRIES — individual pay lines per employee per run
-- ============================================================
create table if not exists payroll_entries (
  id              uuid primary key default uuid_generate_v4(),
  payroll_run_id  uuid references payroll_runs(id) on delete cascade,
  employee_id     uuid references employees(id) on delete set null,
  wasp_id         text not null,
  pay_period_start date,
  pay_period_end  date,
  regular_hours   numeric(6, 2) default 0,
  overtime_hours  numeric(6, 2) default 0,
  total_hours     numeric(6, 2) default 0,
  gross_pay       numeric(10, 2) default 0,
  department      text,
  created_at      timestamptz default now()
);

-- ============================================================
-- IMPORT_ERRORS — row-level errors from bad CSV data
-- ============================================================
create table if not exists import_errors (
  id              uuid primary key default uuid_generate_v4(),
  payroll_run_id  uuid references payroll_runs(id) on delete cascade,
  row_number      int,
  raw_data        text,
  error_message   text,
  created_at      timestamptz default now()
);

-- ============================================================
-- USEFUL VIEW — dept_headcount for dashboard KPIs
-- ============================================================
create or replace view dept_headcount as
select
  department,
  count(*) filter (where status = 'active') as active_count,
  count(*) as total_count,
  round(avg(pay_rate), 2) as avg_pay_rate
from employees
group by department
order by department;

-- ============================================================
-- USEFUL VIEW — today_shifts for live floor presence
-- ============================================================
create or replace view today_shifts as
select
  s.id,
  s.employee_id,
  e.first_name || ' ' || e.last_name as employee_name,
  e.department,
  s.shift_date,
  s.clock_in,
  s.clock_out,
  s.shift_label,
  s.hours_worked,
  s.status,
  case when s.clock_out is null and s.clock_in is not null then true else false end as is_clocked_in
from shifts s
join employees e on e.id = s.employee_id
where s.shift_date = current_date;

-- ============================================================
-- INDEXES for performance
-- ============================================================
create index if not exists idx_shifts_date        on shifts(shift_date);
create index if not exists idx_shifts_employee    on shifts(employee_id);
create index if not exists idx_employees_dept     on employees(department);
create index if not exists idx_employees_status   on employees(status);
create index if not exists idx_payroll_run_date   on payroll_runs(imported_at);
create index if not exists idx_entries_run        on payroll_entries(payroll_run_id);
create index if not exists idx_entries_employee   on payroll_entries(employee_id);

-- ============================================================
-- ROW LEVEL SECURITY (enable when auth is set up)
-- ============================================================
alter table employees       enable row level security;
alter table shifts          enable row level security;
alter table payroll_runs    enable row level security;
alter table payroll_entries enable row level security;
alter table import_errors   enable row level security;

-- Allow authenticated users full access (tighten per role later)
create policy "authenticated full access" on employees
  for all using (auth.role() = 'authenticated');
create policy "authenticated full access" on shifts
  for all using (auth.role() = 'authenticated');
create policy "authenticated full access" on payroll_runs
  for all using (auth.role() = 'authenticated');
create policy "authenticated full access" on payroll_entries
  for all using (auth.role() = 'authenticated');
create policy "authenticated full access" on import_errors
  for all using (auth.role() = 'authenticated');
