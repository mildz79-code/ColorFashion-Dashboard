import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
    }
    _client = createClient(url, key);
  }
  return _client;
}

// Convenience alias used in page files
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

// ── Types ──────────────────────────────────────────────────────
export interface Employee {
  id: string;
  wasp_id: string;
  first_name: string;
  last_name: string;
  department: string | null;
  job_title: string | null;
  pay_rate: number | null;
  pay_type: string | null;
  status: 'active' | 'inactive' | 'on_leave';
  hire_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  shift_id: string;
  shift_date: string;
  clock_in: string | null;
  clock_out: string | null;
  shift_label: string | null;
  hours_worked: number | null;
  shift_status: string;
  employee_id: string;
  wasp_id: string;
  first_name: string;
  last_name: string;
  department: string | null;
  job_title: string | null;
}

export interface PayrollRun {
  id: string;
  file_name: string;
  imported_at: string;
  pay_period_start: string | null;
  pay_period_end: string | null;
  total_employees: number;
  total_hours: number;
  total_gross_pay: number;
  row_count: number;
  error_count: number;
  status: 'processing' | 'completed' | 'partial' | 'failed';
  notes: string | null;
}

export interface DeptHeadcount {
  department: string;
  headcount: number;
  avg_pay_rate: number;
}
