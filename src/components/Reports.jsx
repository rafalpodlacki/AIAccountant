import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { formatGBP, formatDate, monthKey, monthLabel } from '../utils/format';
import { downloadCsv } from '../utils/export';

export default function Reports({ uid }) {
  const [transactions, setTransactions] = useState([]);
  const [exportMonth, setExportMonth] = useState('');

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

  useEffect(() => {
    if (!exportMonth && byMonth.length) setExportMonth(byMonth[0][0]);
  }, [byMonth, exportMonth]);

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

  function exportMonthlySummary() {
    const headers = ['Month', 'Income (net)', 'Expenses (net)', 'Net profit'];
    const rows = byMonth
      .slice()
      .reverse()
      .map(([k, v]) => [monthLabel(k), v.income.toFixed(2), v.expense.toFixed(2), (v.income - v.expense).toFixed(2)]);
    downloadCsv('monthly-summary.csv', headers, rows);
  }

  function exportMonthDetail() {
    if (!exportMonth) return;
    const lines = transactions
      .filter((t) => monthKey(t.date) === exportMonth)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    const headers = ['Date', 'Type', 'Category', 'Description', 'Net', 'VAT', 'Gross'];
    const rows = lines.map((t) => [
      formatDate(t.date), t.type, t.category, t.description || '',
      Number(t.netAmount || 0).toFixed(2), Number(t.vatAmount || 0).toFixed(2), Number(t.grossAmount || 0).toFixed(2),
    ]);
    downloadCsv(`transactions-${exportMonth}.csv`, headers, rows);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <h1 className="font-serif text-3xl text-ink">Reports</h1>
        <div className="flex items-center gap-2">
          <select
            className="export-input"
            value={exportMonth}
            onChange={(e) => setExportMonth(e.target.value)}
          >
            {byMonth.map(([k]) => <option key={k} value={k}>{monthLabel(k)}</option>)}
          </select>
          <button
            onClick={exportMonthDetail}
            disabled={!exportMonth}
            className="border border-ink text-ink px-3 py-1.5 font-mono text-xs hover:bg-ink hover:text-paper transition-colors disabled:opacity-40"
          >
            Export month (CSV)
          </button>
          <button
            onClick={exportMonthlySummary}
            disabled={byMonth.length === 0}
            className="bg-ledger text-paper px-3 py-1.5 font-mono text-xs hover:bg-ledgerlight transition-colors disabled:opacity-40"
          >
            Export all months (CSV)
          </button>
        </div>
      </div>
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

      <style>{`.export-input { border: 1px solid #D8D5C8; background: transparent; padding: 0.35rem 0.5rem; font-family: "IBM Plex Mono", monospace; font-size: 0.75rem; color: #14213D; } .export-input:focus { outline: none; border-color: #1E3D34; }`}</style>
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
