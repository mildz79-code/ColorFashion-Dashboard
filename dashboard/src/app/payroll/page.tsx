export const dynamic = 'force-dynamic';

import { supabase, PayrollRun } from '@/lib/supabase';

async function getPayrollRuns(): Promise<PayrollRun[]> {
  const { data, error } = await supabase
    .from('payroll_runs')
    .select('*')
    .order('imported_at', { ascending: false });
  if (error) {
    console.error('Error fetching payroll runs:', error.message);
    return [];
  }
  return data as PayrollRun[];
}

const statusBadge: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  partial: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-700',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function PayrollPage() {
  const runs = await getPayrollRuns();

  const totalPaid = runs
    .filter((r) => r.status === 'completed' || r.status === 'partial')
    .reduce((sum, r) => sum + Number(r.total_gross_pay), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Payroll Runs</h1>
      <p className="text-sm text-gray-500 mb-6">
        {runs.length} run{runs.length !== 1 ? 's' : ''} &middot; ${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })} total gross pay
      </p>

      {runs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center text-gray-400">
          No payroll runs yet. Drop a CSV file into the Wasp export folder to get started.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-3">File</th>
                <th className="px-4 py-3">Pay Period</th>
                <th className="px-4 py-3">Imported</th>
                <th className="px-4 py-3 text-right">Employees</th>
                <th className="px-4 py-3 text-right">Hours</th>
                <th className="px-4 py-3 text-right">Gross Pay</th>
                <th className="px-4 py-3 text-right">Rows</th>
                <th className="px-4 py-3 text-right">Errors</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium max-w-48 truncate" title={run.file_name}>
                    {run.file_name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {run.pay_period_start && run.pay_period_end
                      ? `${run.pay_period_start} – ${run.pay_period_end}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(run.imported_at)}</td>
                  <td className="px-4 py-3 text-right">{run.total_employees}</td>
                  <td className="px-4 py-3 text-right">{Number(run.total_hours).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    ${Number(run.total_gross_pay).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{run.row_count}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={run.error_count > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                      {run.error_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[run.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {run.status}
                    </span>
                    {run.notes && (
                      <p className="text-xs text-gray-400 mt-0.5 max-w-32 truncate" title={run.notes}>
                        {run.notes}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
