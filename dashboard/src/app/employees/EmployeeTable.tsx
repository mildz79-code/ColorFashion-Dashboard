'use client';

import { useState } from 'react';
import { Employee } from '@/lib/supabase';

const statusBadge: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  on_leave: 'bg-yellow-100 text-yellow-800',
};

export default function EmployeeTable({ employees }: { employees: Employee[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = employees.filter((e) => {
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      e.first_name.toLowerCase().includes(term) ||
      e.last_name.toLowerCase().includes(term) ||
      (e.department ?? '').toLowerCase().includes(term) ||
      (e.job_title ?? '').toLowerCase().includes(term) ||
      e.wasp_id.toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Search by name, department, title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="on_leave">On Leave</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="self-center text-sm text-gray-500">{filtered.length} employees</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-xs text-gray-500 uppercase">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Job Title</th>
              <th className="px-4 py-3">Pay Rate</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Hire Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No employees found.
                </td>
              </tr>
            ) : (
              filtered.map((emp) => (
                <tr key={emp.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {emp.first_name} {emp.last_name}
                    <span className="ml-2 text-xs text-gray-400">#{emp.wasp_id}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.department ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{emp.job_title ?? '—'}</td>
                  <td className="px-4 py-3">
                    {emp.pay_rate != null
                      ? `$${Number(emp.pay_rate).toFixed(2)}${emp.pay_type === 'hourly' ? '/hr' : '/yr'}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[emp.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.hire_date ?? '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
