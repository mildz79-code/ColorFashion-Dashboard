'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Master Dash', icon: '◼' },
  { href: '/orders', label: 'Order/Production', icon: '▤' },
  { href: '/energy', label: 'Energy Dashboard', icon: '⚡' },
  { href: '/shipping', label: 'Shipping', icon: '🚚' },
  { href: '/employees', label: 'Employee Tracking', icon: '👥' },
  { href: '/cost-structure', label: 'Cost Structure', icon: '▣' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-[#111c2c] text-slate-100 flex flex-col shrink-0 min-h-screen border-r border-slate-700/40">
      <div className="px-5 py-5 border-b border-slate-700/40">
        <span className="text-[40px] leading-none font-black tracking-tight">OpsMaster</span>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 text-[22px]">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-md font-semibold transition-colors ${
                active
                  ? 'bg-[#17385b] text-white'
                  : 'text-slate-300 hover:bg-slate-800/90 hover:text-white'
              }`}
            >
              <span className="text-base leading-none opacity-85">{icon}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
