'use client';

import { useState } from 'react';
import { Shift } from '@/lib/supabase';

const statusBadge: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  absent: 'bg-red-100 text-red-700',
};

function fmt(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

const today = new Date().toISOString().split('T')[0];

export default function ShiftTable({ shifts }: { shifts: Shift[] }) {
  const [view, setView] = useState<'today' | 'all'>('today');
  const [search, setSearch] = useState('');

  const displayed = shifts.filter((s) => {
    if (view === 'today' && s.shift_date !== today) return false;
    if (search) {
      const t = search.toLowerCase();
      return (
        s.first_name.toLowerCase().includes(t) ||
        s.last_name.toLowerCase().includes(t) ||
        (s.department ?? '').toLowerCase().includes(t)
      );
    }
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex rounded-lg overflow-hidden border border-gray-300 text-sm">
          {(['today', 'all'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 ${view === v ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              {v === 'today' ? "Today's Shifts" : 'All Shifts'}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search name or department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <span className="self-center text-sm text-gray-500">{displayed.length} shifts</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Shift</th>
              <th className="px-4 py-3">Clock In</th>
              <th className="px-4 py-3">Clock Out</th>
              <th className="px-4 py-3">Hours</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No shifts found.
                </td>
              </tr>
            ) : (
              displayed.map((s) => (
                <tr key={s.shift_id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {s.first_name} {s.last_name}
                    <span className="ml-1 text-xs text-gray-400">#{s.wasp_id}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{fmtDate(s.shift_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{s.shift_label ?? '—'}</td>
                  <td className="px-4 py-3">{fmt(s.clock_in)}</td>
                  <td className="px-4 py-3">{fmt(s.clock_out)}</td>
                  <td className="px-4 py-3 font-medium">{s.hours_worked != null ? `${Number(s.hours_worked).toFixed(2)}h` : '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.department ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[s.shift_status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {s.shift_status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
