export const dynamic = 'force-dynamic';

import { supabase, Employee } from '@/lib/supabase';
import EmployeeTable from './EmployeeTable';

async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('last_name', { ascending: true });
  if (error) {
    console.error('Error fetching employees:', error.message);
    return [];
  }
  return data as Employee[];
}

export default async function EmployeesPage() {
  const employees = await getEmployees();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Employees</h1>
      <p className="text-sm text-gray-500 mb-6">
        {employees.length} total employees
      </p>
      <EmployeeTable employees={employees} />
    </div>
  );
}
