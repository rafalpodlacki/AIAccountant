import React from 'react';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'clients', label: 'Clients' },
  { id: 'vat', label: 'VAT return' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' },
];

export default function Sidebar({ page, setPage, companyName }) {
  const { logout } = useAuth();

  return (
    <div className="w-full md:w-56 md:min-h-screen bg-ink text-paper flex md:flex-col no-print">
      <div className="p-5 hidden md:block">
        <div className="font-mono text-[10px] tracking-wide text-paper/50 mb-1">DOUBLE-ENTRY</div>
        <div className="font-serif text-xl">Ledger</div>
        {companyName && (
          <div className="font-mono text-[11px] text-paper/60 mt-1 truncate">{companyName}</div>
        )}
      </div>
      <nav className="flex md:flex-col flex-1 overflow-x-auto md:overflow-visible">
        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            className={`text-left px-5 py-3 font-mono text-sm whitespace-nowrap border-l-2 md:border-l-2 transition-colors ${
              page === item.id
                ? 'border-paper bg-white/10 text-paper'
                : 'border-transparent text-paper/60 hover:text-paper hover:bg-white/5'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="p-5 hidden md:block">
        <button
          onClick={logout}
          className="font-mono text-xs text-paper/50 hover:text-paper transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
