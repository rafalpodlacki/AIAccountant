import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { formatGBP, monthKey, monthLabel } from '../utils/format';

export default function Reports({ uid }) {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'users', uid, 'transactions'));
    return onSnapshot(q, (snap) => setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, [uid]);

  const byMonth = useMemo(() => {
    const map = {};
    transactions.forEach((t) => {
      const k = monthKey(t.date);
      if (!map[k]) map[k] = { income: 0, expense: 0 };
      map[k][t.type] += Number(t.netAmount) || 0;
    });
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [transactions]);

  const byCategory = useMemo(() => {
    const map = {};
    transactions.filter((t) => t.type === 'expense').forEach((t) => {
      map[t.category] = (map[t.category] || 0) + (Number(t.netAmount) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((a, t) => a + (Number(t.netAmount) || 0), 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((a, t) => a + (Number(t.netAmount) || 0), 0);
  const maxCategory = byCategory.length ? byCategory[0][1] : 1;
  const maxMonth = byMonth.length ? Math.max(...byMonth.map(([, v]) => Math.max(v.income, v.expense))) : 1;

  return (
    <div>
      <h1 className="font-serif text-3xl text-ink mb-1">Reports</h1>
      <p className="font-mono text-xs text-ink/60 mb-8">Profit and loss, all figures excl. VAT.</p>

      <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg font-mono">
        <Stat label="Income" value={totalIncome} />
        <Stat label="Expenses" value={totalExpense} negative />
        <Stat label="Net profit" value={totalIncome - totalExpense} bold />
      </div>

      <h2 className="font-serif text-xl text-ink mb-3">By month</h2>
      <div className="mb-10 max-w-2xl">
        {byMonth.map(([k, v]) => (
          <div key={k} className="mb-3">
            <div className="flex justify-between font-mono text-xs text-ink/70 mb-1">
              <span>{monthLabel(k)}</span>
              <span>{formatGBP(v.income - v.expense)} net</span>
            </div>
            <Bar value={v.income} max={maxMonth} color="bg-ledger" label={formatGBP(v.income)} />
            <Bar value={v.expense} max={maxMonth} color="bg-debit" label={formatGBP(v.expense)} />
          </div>
        ))}
        {byMonth.length === 0 && <p className="font-mono text-xs text-ink/50">No data yet.</p>}
      </div>

      <h2 className="font-serif text-xl text-ink mb-3">Expenses by category</h2>
      <div className="max-w-2xl">
        {byCategory.map(([cat, amount]) => (
          <div key={cat} className="mb-2">
            <div className="flex justify-between font-mono text-xs text-ink/70 mb-1">
              <span>{cat}</span>
              <span>{formatGBP(amount)}</span>
            </div>
            <Bar value={amount} max={maxCategory} color="bg-debit" />
          </div>
        ))}
        {byCategory.length === 0 && <p className="font-mono text-xs text-ink/50">No expenses yet.</p>}
      </div>
    </div>
  );
}

function Stat({ label, value, negative, bold }) {
  return (
    <div className="border border-line p-4">
      <div className="text-[11px] text-ink/60 mb-1">{label}</div>
      <div className={`text-lg tabular ${bold ? 'font-semibold' : ''} ${negative ? 'text-debit' : 'text-ink'}`}>
        {formatGBP(value)}
      </div>
    </div>
  );
}

function Bar({ value, max, color, label }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-3 bg-line/40 relative">
      <div className={`h-3 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
