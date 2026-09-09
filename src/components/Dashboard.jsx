import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { formatGBP, formatDate, monthKey } from '../utils/format';

export default function Dashboard({ uid, settings, setPage }) {
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    const un1 = onSnapshot(query(collection(db, 'users', uid, 'transactions')), (snap) =>
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const un2 = onSnapshot(query(collection(db, 'users', uid, 'invoices')), (snap) =>
      setInvoices(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => { un1(); un2(); };
  }, [uid]);

  const thisMonth = monthKey(new Date().toISOString());
  const monthTx = transactions.filter((t) => monthKey(t.date) === thisMonth);
  const monthIncome = monthTx.filter((t) => t.type === 'income').reduce((a, t) => a + (Number(t.netAmount) || 0), 0);
  const monthExpense = monthTx.filter((t) => t.type === 'expense').reduce((a, t) => a + (Number(t.netAmount) || 0), 0);

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((a, t) => a + (Number(t.netAmount) || 0), 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((a, t) => a + (Number(t.netAmount) || 0), 0);

  const unpaidInvoices = invoices.filter((i) => i.status !== 'paid');
  const unpaidTotal = unpaidInvoices.reduce((a, i) => a + (Number(i.total) || 0), 0);

  const recent = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink mb-1">
        {settings?.companyName || 'Your company'}
      </h1>
      <p className="font-mono text-xs text-ink/60 mb-8">
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Stat label="This month, in" value={monthIncome} />
        <Stat label="This month, out" value={monthExpense} negative />
        <Stat label="Lifetime net" value={totalIncome - totalExpense} bold />
        <Stat label="Owed to you" value={unpaidTotal} onClick={() => setPage('invoices')} />
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="font-serif text-xl text-ink mb-3">Recent activity</h2>
          <table className="w-full ledger-table text-sm">
            <tbody>
              {recent.map((t) => (
                <tr key={t.id}>
                  <td className="py-2 pr-2 font-mono text-xs">{formatDate(t.date)}</td>
                  <td className="py-2 pr-2">{t.description || t.category}</td>
                  <td className={`py-2 text-right tabular ${t.type === 'expense' ? 'text-debit' : 'text-ledger'}`}>
                    {t.type === 'expense' ? '−' : ''}{formatGBP(t.grossAmount)}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td className="py-6 text-center font-mono text-xs text-ink/50">Nothing recorded yet.</td></tr>
              )}
            </tbody>
          </table>
          <button onClick={() => setPage('transactions')} className="font-mono text-xs text-ledger hover:underline mt-3">
            View all →
          </button>
        </div>

        <div>
          <h2 className="font-serif text-xl text-ink mb-3">Outstanding invoices</h2>
          <table className="w-full ledger-table text-sm">
            <tbody>
              {unpaidInvoices.slice(0, 6).map((i) => (
                <tr key={i.id}>
                  <td className="py-2 pr-2 font-mono text-xs">{i.invoiceNumber}</td>
                  <td className="py-2 pr-2">{i.clientName}</td>
                  <td className="py-2 text-right tabular">{formatGBP(i.total)}</td>
                </tr>
              ))}
              {unpaidInvoices.length === 0 && (
                <tr><td className="py-6 text-center font-mono text-xs text-ink/50">Nothing outstanding.</td></tr>
              )}
            </tbody>
          </table>
          <button onClick={() => setPage('invoices')} className="font-mono text-xs text-ledger hover:underline mt-3">
            View all →
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, negative, bold, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`border border-line p-4 ${onClick ? 'cursor-pointer hover:border-ink' : ''}`}
    >
      <div className="font-mono text-[11px] text-ink/60 mb-1">{label}</div>
      <div className={`font-mono text-lg tabular ${bold ? 'font-semibold' : ''} ${negative ? 'text-debit' : 'text-ink'}`}>
        {formatGBP(value)}
      </div>
    </div>
  );
}
