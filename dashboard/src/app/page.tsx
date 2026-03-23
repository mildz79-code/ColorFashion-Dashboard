export const dynamic = 'force-dynamic';

import { supabase, DeptHeadcount, PayrollRun } from '@/lib/supabase';
import StatCard from '@/components/StatCard';
import Link from 'next/link';

async function getDashboardData() {
  const [empResult, deptResult, payrollResult, todayResult] = await Promise.all([
    supabase
      .from('employees')
      .select('id, status', { count: 'exact' }),
    supabase
      .from('dept_headcount')
      .select('*')
      .limit(6),
    supabase
      .from('payroll_runs')
      .select('*')
      .order('imported_at', { ascending: false })
      .limit(5),
    supabase
      .from('today_shifts')
      .select('shift_id', { count: 'exact' }),
  ]);

  const employees = empResult.data ?? [];
  const active = employees.filter((e) => e.status === 'active').length;
  const onLeave = employees.filter((e) => e.status === 'on_leave').length;
  const inactive = employees.filter((e) => e.status === 'inactive').length;

  return {
    total: empResult.count ?? 0,
    active,
    onLeave,
    inactive,
    departments: (deptResult.data ?? []) as DeptHeadcount[],
    recentPayroll: (payrollResult.data ?? []) as PayrollRun[],
    todayShiftCount: todayResult.count ?? 0,
  };
}

const statusColor: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
};

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-sm text-gray-500 mb-6">Employee tracking overview</p>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Employees" value={data.total} />
        <StatCard label="Active" value={data.active} color="bg-green-50" />
        <StatCard label="On Leave" value={data.onLeave} color="bg-yellow-50" />
        <StatCard label="Today's Shifts" value={data.todayShiftCount} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Headcount */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Department Headcount</h2>
            <Link href="/employees" className="text-xs text-indigo-600 hover:underline">View all →</Link>
          </div>
          {data.departments.length === 0 ? (
            <p className="text-sm text-gray-400">No department data yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase border-b">
                  <th className="pb-2">Department</th>
                  <th className="pb-2 text-right">Headcount</th>
                  <th className="pb-2 text-right">Avg Pay Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.departments.map((d) => (
                  <tr key={d.department} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 font-medium">{d.department ?? '—'}</td>
                    <td className="py-2 text-right">{d.headcount}</td>
                    <td className="py-2 text-right">${Number(d.avg_pay_rate).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Payroll Runs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Recent Payroll Runs</h2>
            <Link href="/payroll" className="text-xs text-indigo-600 hover:underline">View all →</Link>
          </div>
          {data.recentPayroll.length === 0 ? (
            <p className="text-sm text-gray-400">No payroll runs yet. Drop a CSV into the importer folder.</p>
          ) : (
            <ul className="space-y-3">
              {data.recentPayroll.map((run) => (
                <li key={run.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{run.file_name}</p>
                    <p className="text-xs text-gray-500">
                      {run.pay_period_start} – {run.pay_period_end} &middot; {run.total_employees} emp &middot; ${Number(run.total_gross_pay).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[run.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {run.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
