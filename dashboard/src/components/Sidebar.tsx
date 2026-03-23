'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Dashboard', icon: '⬛' },
  { href: '/employees', label: 'Employees', icon: '👤' },
  { href: '/shifts', label: 'Shifts', icon: '🕐' },
  { href: '/payroll', label: 'Payroll', icon: '💰' },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0 min-h-screen">
      <div className="px-5 py-6 border-b border-slate-700">
        <span className="text-lg font-bold tracking-tight">OpsMaster</span>
        <p className="text-xs text-slate-400 mt-0.5">Employee Tracking</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
