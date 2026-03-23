export const dynamic = 'force-dynamic';

import { supabase, Shift } from '@/lib/supabase';
import ShiftTable from './ShiftTable';

async function getShifts(): Promise<Shift[]> {
  const { data, error } = await supabase
    .from('shifts')
    .select(`
      id,
      shift_date,
      clock_in,
      clock_out,
      shift_label,
      hours_worked,
      status,
      department,
      employee_id,
      wasp_id,
      employees (first_name, last_name, job_title)
    `)
    .order('shift_date', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Error fetching shifts:', error.message);
    return [];
  }

  return (data as any[]).map((row) => ({
    shift_id: row.id,
    shift_date: row.shift_date,
    clock_in: row.clock_in,
    clock_out: row.clock_out,
    shift_label: row.shift_label,
    hours_worked: row.hours_worked,
    shift_status: row.status,
    employee_id: row.employee_id,
    wasp_id: row.wasp_id,
    first_name: row.employees?.first_name ?? '',
    last_name: row.employees?.last_name ?? '',
    department: row.department,
    job_title: row.employees?.job_title ?? null,
  })) as Shift[];
}

async function getTodayCount(): Promise<number> {
  const { count } = await supabase
    .from('today_shifts')
    .select('*', { count: 'exact', head: true });
  return count ?? 0;
}

export default async function ShiftsPage() {
  const [shifts, todayCount] = await Promise.all([getShifts(), getTodayCount()]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Shifts</h1>
      <p className="text-sm text-gray-500 mb-6">
        {todayCount} shift{todayCount !== 1 ? 's' : ''} today &middot; showing last {shifts.length} records
      </p>
      <ShiftTable shifts={shifts} />
    </div>
  );
}
